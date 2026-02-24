const Leave = require('../models/Leave');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const logger = require('../utils/logger');
const {
    subMonths,
    addMonths,
    startOfMonth,
    endOfMonth,
    format,
    differenceInDays,
    addDays,
    isWeekend,
    eachDayOfInterval,
} = require('date-fns');

// Generates smart leave suggestions for employees who haven't taken leave recently
const getSmartSuggestions = async (employeeId) => {
    try {
        const user = await User.findById(employeeId);
        if (!user) {
            return { shouldSuggest: false, message: 'User not found' };
        }

        const now = new Date();

        // Find last approved leave
        const lastLeave = await Leave.findOne({
            employee: employeeId,
            status: 'approved',
            endDate: { $lte: now },
        }).sort({ endDate: -1 });

        const daysSinceLastLeave = lastLeave
            ? differenceInDays(now, new Date(lastLeave.endDate))
            : differenceInDays(now, new Date(user.joinDate));

        // Only suggest if 30+ days without leave
        if (daysSinceLastLeave < 30) {
            return { shouldSuggest: false, daysSinceLastLeave };
        }

        // Calculate remaining balance
        const totalBalance = Object.values(user.leaveBalance || {}).reduce((sum, v) => sum + v, 0);

        // Find upcoming holidays to suggest adjacent leave
        const upcomingHolidays = await Holiday.find({
            date: { $gte: now, $lte: addMonths(now, 2) },
        }).sort({ date: 1 }).limit(5);

        // Generate 3 optimal leave windows
        const windows = await generateOptimalWindows(employeeId, user.department, now, upcomingHolidays);

        return {
            shouldSuggest: true,
            daysSinceLastLeave,
            remainingBalance: totalBalance,
            message: `You haven't taken a break in ${daysSinceLastLeave} days. Your balance has ${totalBalance} days remaining.`,
            windows,
            upcomingHolidays: upcomingHolidays.map((h) => ({
                name: h.name,
                date: format(new Date(h.date), 'yyyy-MM-dd'),
            })),
        };
    } catch (error) {
        logger.error(`Smart suggestions error: ${error.message}`);
        return { shouldSuggest: false, error: error.message };
    }
};

// Finds optimal leave windows considering weekends, holidays, and team availability
const generateOptimalWindows = async (employeeId, departmentId, now, holidays) => {
    const windows = [];

    // Strategy 1: Adjacent to upcoming holiday
    if (holidays.length > 0) {
        const holiday = holidays[0];
        const holidayDate = new Date(holiday.date);
        // Check day before or after the holiday
        const beforeHoliday = addDays(holidayDate, -1);
        if (!isWeekend(beforeHoliday) && beforeHoliday > now) {
            windows.push({
                startDate: format(beforeHoliday, 'yyyy-MM-dd'),
                endDate: format(holidayDate, 'yyyy-MM-dd'),
                reason: `Adjacent to ${holiday.name} — maximize time off with fewer leave days`,
                type: 'holiday_adjacent',
            });
        }
    }

    // Strategy 2: Long weekend — take Friday or Monday off
    for (let weekOffset = 1; weekOffset <= 4; weekOffset++) {
        const futureDate = addDays(now, weekOffset * 7);
        const friday = addDays(futureDate, 5 - futureDate.getDay());
        if (friday > now && windows.length < 3) {
            windows.push({
                startDate: format(friday, 'yyyy-MM-dd'),
                endDate: format(friday, 'yyyy-MM-dd'),
                reason: 'Long weekend — one day off for a 3-day break',
                type: 'long_weekend',
            });
            break;
        }
    }

    // Strategy 3: Mid-week breather
    const nextWednesday = addDays(now, (3 - now.getDay() + 7) % 7 + 7);
    if (windows.length < 3) {
        windows.push({
            startDate: format(nextWednesday, 'yyyy-MM-dd'),
            endDate: format(nextWednesday, 'yyyy-MM-dd'),
            reason: 'Mid-week break — recharge without disrupting the full week',
            type: 'midweek_break',
        });
    }

    return windows.slice(0, 3);
};

// Generates trend-based forecast for leave demand (deterministic, statistical)
const getTrendForecast = async (departmentFilter, months = 3) => {
    try {
        const now = new Date();
        // Use 12 months of historical data
        const historicalStart = startOfMonth(subMonths(now, 12));

        const matchFilter = { status: 'approved', appliedAt: { $gte: historicalStart } };

        // Apply department filter if specified
        if (departmentFilter) {
            const deptUsers = await User.find({ department: departmentFilter }).select('_id');
            matchFilter.employee = { $in: deptUsers.map((u) => u._id) };
        }

        // Aggregate historical data by month
        const historical = await Leave.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: { year: { $year: '$appliedAt' }, month: { $month: '$appliedAt' } },
                    count: { $sum: 1 },
                    totalDays: { $sum: '$totalDays' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        // Format historical data
        const historicalFormatted = historical.map((h) => ({
            month: `${h._id.year}-${String(h._id.month).padStart(2, '0')}`,
            label: format(new Date(h._id.year, h._id.month - 1), 'MMM yyyy'),
            count: h.count,
            totalDays: h.totalDays,
            type: 'historical',
        }));

        // ━━━ Generate forecast using weighted rolling average ━━━
        const values = historicalFormatted.map((h) => h.count);
        const forecast = [];

        for (let i = 1; i <= months; i++) {
            const forecastDate = addMonths(now, i);
            const forecastMonth = forecastDate.getMonth() + 1;

            // Find same month last year for seasonal weight
            const sameMonthLastYear = historical.find(
                (h) => h._id.month === forecastMonth
            );

            // Calculate forecast using weighted average
            // 60% weight on recent 3-month average, 40% weight on same month last year
            const recentValues = values.slice(-3);
            const recentAvg = recentValues.length > 0
                ? recentValues.reduce((a, b) => a + b, 0) / recentValues.length
                : 0;
            const seasonalValue = sameMonthLastYear?.count || recentAvg;

            const forecastValue = Math.round(recentAvg * 0.6 + seasonalValue * 0.4);

            // Estimate total days using historical ratio
            const avgDaysPerLeave = historicalFormatted.length > 0
                ? historicalFormatted.reduce((sum, h) => sum + h.totalDays, 0) /
                historicalFormatted.reduce((sum, h) => sum + h.count, 0)
                : 2;

            forecast.push({
                month: format(forecastDate, 'yyyy-MM'),
                label: format(forecastDate, 'MMM yyyy'),
                count: forecastValue,
                totalDays: Math.round(forecastValue * avgDaysPerLeave),
                type: 'forecast',
                method: 'Weighted rolling average with seasonal adjustment',
            });
        }

        return {
            historical: historicalFormatted,
            forecast,
            methodology: 'Trend-Based Forecast (Decision Support) — 60% recent avg + 40% seasonal',
            disclaimer: 'Forecasted values are trend-based estimates for planning purposes only',
        };
    } catch (error) {
        logger.error(`Trend forecast error: ${error.message}`);
        return { historical: [], forecast: [], error: error.message };
    }
};

module.exports = { getSmartSuggestions, getTrendForecast };

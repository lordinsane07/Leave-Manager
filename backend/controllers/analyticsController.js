const Leave = require('../models/Leave');
const User = require('../models/User');
const Department = require('../models/Department');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/authMiddleware');
const { startOfMonth, endOfMonth, subMonths, format, parseISO } = require('date-fns');
const logger = require('../utils/logger');

// ━━━ GET /api/analytics/overview — Company-wide overview stats (admin) ━━━
const getOverview = asyncHandler(async (req, res) => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Aggregate current month vs last month metrics
    const [
        totalEmployees,
        totalLeaves,
        pendingLeaves,
        approvedThisMonth,
        approvedLastMonth,
        rejectedThisMonth,
        onLeaveToday,
    ] = await Promise.all([
        User.countDocuments({ isActive: true }),
        Leave.countDocuments(),
        Leave.countDocuments({ status: 'pending' }),
        Leave.countDocuments({ status: 'approved', processedAt: { $gte: monthStart, $lte: monthEnd } }),
        Leave.countDocuments({ status: 'approved', processedAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
        Leave.countDocuments({ status: 'rejected', processedAt: { $gte: monthStart, $lte: monthEnd } }),
        Leave.countDocuments({
            status: 'approved',
            startDate: { $lte: now },
            endDate: { $gte: now },
        }),
    ]);

    // Calculate approval rate delta between months
    const thisMonthTotal = approvedThisMonth + rejectedThisMonth;
    const approvalRate = thisMonthTotal > 0 ? Math.round((approvedThisMonth / thisMonthTotal) * 100) : 0;

    return ApiResponse.ok(res, 'Analytics overview', {
        overview: {
            totalEmployees,
            totalLeaves,
            pendingLeaves,
            approvedThisMonth,
            approvedLastMonth,
            approvalRate,
            onLeaveToday,
            approvalDelta: approvedThisMonth - approvedLastMonth,
        },
    });
});

// ━━━ GET /api/analytics/leave-distribution — Leave type breakdown ━━━
const getLeaveDistribution = asyncHandler(async (req, res) => {
    const { department, from, to } = req.query;
    const filter = { status: 'approved' };

    // Scope to manager's department if applicable
    if (req.user.role === 'manager') {
        const deptUsers = await User.find({ department: req.user.department }).select('_id');
        filter.employee = { $in: deptUsers.map((u) => u._id) };
    } else if (department) {
        const deptUsers = await User.find({ department }).select('_id');
        filter.employee = { $in: deptUsers.map((u) => u._id) };
    }

    if (from) filter.startDate = { ...filter.startDate, $gte: new Date(from) };
    if (to) filter.endDate = { ...filter.endDate, $lte: new Date(to) };

    // Group by leave type and sum total days
    const distribution = await Leave.aggregate([
        { $match: filter },
        {
            $group: {
                _id: '$leaveType',
                count: { $sum: 1 },
                totalDays: { $sum: '$totalDays' },
            },
        },
        { $sort: { totalDays: -1 } },
    ]);

    return ApiResponse.ok(res, 'Leave distribution', { distribution });
});

// ━━━ GET /api/analytics/monthly-trend — Monthly leave volume for past 12 months ━━━
const getMonthlyTrend = asyncHandler(async (req, res) => {
    const now = new Date();
    const twelveMonthsAgo = subMonths(now, 11);
    const start = startOfMonth(twelveMonthsAgo);

    const filter = { appliedAt: { $gte: start } };

    // Scope to manager's department
    if (req.user.role === 'manager') {
        const deptUsers = await User.find({ department: req.user.department }).select('_id');
        filter.employee = { $in: deptUsers.map((u) => u._id) };
    }

    // Group leaves by month
    const trend = await Leave.aggregate([
        { $match: filter },
        {
            $group: {
                _id: {
                    year: { $year: '$appliedAt' },
                    month: { $month: '$appliedAt' },
                },
                total: { $sum: 1 },
                approved: {
                    $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
                },
                rejected: {
                    $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
                },
                totalDays: { $sum: '$totalDays' },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Format for frontend charting
    const formatted = trend.map((t) => ({
        month: `${t._id.year}-${String(t._id.month).padStart(2, '0')}`,
        label: format(new Date(t._id.year, t._id.month - 1), 'MMM yyyy'),
        total: t.total,
        approved: t.approved,
        rejected: t.rejected,
        totalDays: t.totalDays,
    }));

    return ApiResponse.ok(res, 'Monthly trend', { trend: formatted });
});

// ━━━ GET /api/analytics/department-comparison — Department-wise stats (admin) ━━━
const getDepartmentComparison = asyncHandler(async (req, res) => {
    const departments = await Department.find().select('name code');

    const comparison = await Promise.all(
        departments.map(async (dept) => {
            const deptUsers = await User.find({ department: dept._id }).select('_id');
            const userIds = deptUsers.map((u) => u._id);

            const [totalLeaves, approvedLeaves, totalDays] = await Promise.all([
                Leave.countDocuments({ employee: { $in: userIds } }),
                Leave.countDocuments({ employee: { $in: userIds }, status: 'approved' }),
                Leave.aggregate([
                    { $match: { employee: { $in: userIds }, status: 'approved' } },
                    { $group: { _id: null, total: { $sum: '$totalDays' } } },
                ]),
            ]);

            return {
                department: dept.name,
                code: dept.code,
                employeeCount: deptUsers.length,
                totalLeaves,
                approvedLeaves,
                totalDaysUsed: totalDays[0]?.total || 0,
                avgDaysPerEmployee: deptUsers.length > 0
                    ? Math.round((totalDays[0]?.total || 0) / deptUsers.length * 10) / 10
                    : 0,
            };
        })
    );

    return ApiResponse.ok(res, 'Department comparison', { comparison });
});

// ━━━ GET /api/analytics/team — Team analytics for managers ━━━
const getTeamAnalytics = asyncHandler(async (req, res) => {
    const departmentId = req.user.department;

    const teamMembers = await User.find({ department: departmentId, isActive: true })
        .select('name email avatar leaveBalance totalLeaveTaken');

    // Find who's currently on leave
    const now = new Date();
    const onLeave = await Leave.find({
        employee: { $in: teamMembers.map((m) => m._id) },
        status: 'approved',
        startDate: { $lte: now },
        endDate: { $gte: now },
    }).populate('employee', 'name');

    // Calculate average processing time for the team
    const processedLeaves = await Leave.find({
        employee: { $in: teamMembers.map((m) => m._id) },
        status: { $in: ['approved', 'rejected'] },
        processedAt: { $exists: true },
    }).select('appliedAt processedAt');

    let avgProcessingHours = 0;
    if (processedLeaves.length > 0) {
        const totalHours = processedLeaves.reduce((sum, l) => {
            return sum + (l.processedAt - l.appliedAt) / (1000 * 60 * 60);
        }, 0);
        avgProcessingHours = Math.round((totalHours / processedLeaves.length) * 10) / 10;
    }

    return ApiResponse.ok(res, 'Team analytics', {
        teamSize: teamMembers.length,
        onLeaveToday: onLeave.map((l) => ({ name: l.employee.name, leaveId: l._id })),
        avgProcessingHours,
        members: teamMembers,
    });
});

module.exports = {
    getOverview,
    getLeaveDistribution,
    getMonthlyTrend,
    getDepartmentComparison,
    getTeamAnalytics,
};

const Leave = require('../models/Leave');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const logger = require('../utils/logger');
const { startOfMonth, endOfMonth, addMonths, subMonths, format } = require('date-fns');

// Rule-based leave advice engine — provides deterministic, explainable suggestions
const getLeaveAdvice = async (employeeId, requestedDates, leaveType) => {
    try {
        const user = await User.findById(employeeId).populate('department');
        if (!user) {
            return { advice: 'Unable to generate advice — user not found', score: 0, alternatives: [] };
        }

        const { startDate, endDate } = requestedDates || {};
        const balance = user.leaveBalance?.[leaveType] ?? 0;
        const factors = [];
        let score = 70; // Base score

        // Factor 1: Leave balance sufficiency
        if (balance <= 2) {
            score -= 20;
            factors.push('Low remaining balance for this leave type');
        } else if (balance >= 10) {
            score += 10;
            factors.push('Sufficient balance available');
        }

        // Factor 2: Check for team members on leave during the same period
        if (startDate && endDate) {
            const deptEmployees = await User.find({ department: user.department?._id }).select('_id');
            const overlappingLeaves = await Leave.countDocuments({
                employee: { $in: deptEmployees.map((e) => e._id), $ne: employeeId },
                status: { $in: ['approved', 'pending'] },
                startDate: { $lte: new Date(endDate) },
                endDate: { $gte: new Date(startDate) },
            });

            if (overlappingLeaves >= 3) {
                score -= 25;
                factors.push(`${overlappingLeaves} team members already on leave during this period`);
            } else if (overlappingLeaves === 0) {
                score += 15;
                factors.push('No team members on leave — good team coverage');
            } else {
                factors.push(`${overlappingLeaves} team member(s) on leave during this period`);
            }
        }

        // Factor 3: Check proximity to holidays (adjacent leave is efficient)
        if (startDate) {
            const nearbyHolidays = await Holiday.find({
                date: {
                    $gte: subMonths(new Date(startDate), 1),
                    $lte: addMonths(new Date(endDate || startDate), 1),
                },
            });
            if (nearbyHolidays.length > 0) {
                score += 5;
                factors.push('Leave adjacent to public holiday — efficient use of days');
            }
        }

        // Factor 4: Recent leave frequency
        const recentLeaves = await Leave.countDocuments({
            employee: employeeId,
            status: 'approved',
            startDate: { $gte: subMonths(new Date(), 1) },
        });
        if (recentLeaves >= 2) {
            score -= 10;
            factors.push('Multiple leaves taken in the past month');
        }

        // Clamp score between 0 and 100
        score = Math.max(0, Math.min(100, score));

        // Generate alternative date suggestions
        const alternatives = await generateAlternatives(employeeId, startDate, user.department?._id);

        // Determine recommendation category
        let recommendation;
        if (score >= 70) recommendation = 'Good time to take leave';
        else if (score >= 40) recommendation = 'Acceptable, but consider alternatives';
        else recommendation = 'Consider rescheduling for better team coverage';

        return {
            score,
            recommendation,
            factors,
            alternatives,
            label: 'Heuristic-Based Analysis',
        };
    } catch (error) {
        logger.error(`Leave advice error: ${error.message}`);
        return { advice: 'Unable to generate advice at this time', score: 50, factors: [], alternatives: [] };
    }
};

// Generates 3 alternative date windows with low team-leave overlap
const generateAlternatives = async (employeeId, startDate, departmentId) => {
    const alternatives = [];

    if (!startDate) return alternatives;

    const baseDate = new Date(startDate);

    // Check 3 upcoming weeks for low-conflict windows
    for (let weekOffset = 1; weekOffset <= 3; weekOffset++) {
        const altStart = new Date(baseDate);
        altStart.setDate(altStart.getDate() + weekOffset * 7);
        const altEnd = new Date(altStart);
        altEnd.setDate(altEnd.getDate() + 2); // 3-day window

        let overlap = 0;
        if (departmentId) {
            const deptEmployees = await User.find({ department: departmentId }).select('_id');
            overlap = await Leave.countDocuments({
                employee: { $in: deptEmployees.map((e) => e._id), $ne: employeeId },
                status: { $in: ['approved', 'pending'] },
                startDate: { $lte: altEnd },
                endDate: { $gte: altStart },
            });
        }

        alternatives.push({
            startDate: format(altStart, 'yyyy-MM-dd'),
            endDate: format(altEnd, 'yyyy-MM-dd'),
            teamConflicts: overlap,
            note: overlap === 0 ? 'No team conflicts' : `${overlap} team member(s) on leave`,
        });
    }

    // Sort by fewest conflicts
    return alternatives.sort((a, b) => a.teamConflicts - b.teamConflicts);
};

// Generates a professional rejection reason based on context
const getRejectionReason = async (leaveId, reasonCode) => {
    const reasons = {
        team_coverage: 'Due to limited team coverage during the requested period, we are unable to approve this leave at this time. Please consider selecting alternative dates when more team members are available.',
        project_deadline: 'A critical project deadline falls within your requested leave period. We kindly ask you to reschedule to ensure project continuity. Please coordinate with your project lead.',
        short_notice: 'The leave request was submitted with insufficient advance notice per company policy. Please submit future requests at least 5 business days in advance.',
        balance_insufficient: 'Your current leave balance is insufficient for the requested duration. Please review your available balance and adjust your request accordingly.',
        peak_period: 'The requested dates fall within a peak business period. Leave approvals are limited during this time. Please consider an alternative timeframe.',
        default: 'After careful review, we are unable to approve this leave request at this time. Please reach out to your manager for further discussion and alternative arrangements.',
    };

    // Enrich with leave context if available
    let context = '';
    if (leaveId) {
        const leave = await Leave.findById(leaveId).populate('employee', 'name');
        if (leave) {
            context = ` This applies to your ${leave.leaveType} leave request for ${leave.totalDays} day(s).`;
        }
    }

    const suggestion = (reasons[reasonCode] || reasons.default) + context;

    return {
        suggestion,
        reasonCode: reasonCode || 'default',
        isEditable: true,
        label: 'Suggested — please review and edit as needed',
    };
};

module.exports = { getLeaveAdvice, getRejectionReason };

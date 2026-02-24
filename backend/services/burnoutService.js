const Leave = require('../models/Leave');
const User = require('../models/User');
const AIInsight = require('../models/AIInsight');
const logger = require('../utils/logger');
const { differenceInDays, subMonths, subDays } = require('date-fns');

// Burnout risk factor weights — transparent and explainable
const FACTORS = {
    CONSECUTIVE_DAYS_WEIGHT: 0.30,
    UTILIZATION_WEIGHT: 0.25,
    FREQUENCY_WEIGHT: 0.20,
    SICK_LEAVE_WEIGHT: 0.25,
};

// Thresholds for each factor
const THRESHOLDS = {
    HIGH_CONSECUTIVE_DAYS: 45,
    MODERATE_CONSECUTIVE_DAYS: 30,
    LOW_UTILIZATION_RATIO: 0.20,
    HIGH_SICK_FREQUENCY: 3,
};

// Calculates burnout score for an employee using rule-based transparent scoring
const calculateBurnoutScore = async (employeeId) => {
    try {
        const user = await User.findById(employeeId);
        if (!user) {
            return { score: 0, category: 'Unknown', factors: [], message: 'User not found' };
        }

        const now = new Date();
        const factors = [];
        let rawScores = { consecutive: 0, utilization: 0, frequency: 0, sickLeave: 0 };

        // ━━━ Factor 1: Consecutive working days without leave ━━━
        const lastApprovedLeave = await Leave.findOne({
            employee: employeeId,
            status: 'approved',
            endDate: { $lte: now },
        }).sort({ endDate: -1 });

        const daysSinceLastLeave = lastApprovedLeave
            ? differenceInDays(now, new Date(lastApprovedLeave.endDate))
            : differenceInDays(now, new Date(user.joinDate));

        if (daysSinceLastLeave > THRESHOLDS.HIGH_CONSECUTIVE_DAYS) {
            rawScores.consecutive = 100;
            factors.push(`${daysSinceLastLeave} consecutive days without leave (high risk threshold: ${THRESHOLDS.HIGH_CONSECUTIVE_DAYS})`);
        } else if (daysSinceLastLeave > THRESHOLDS.MODERATE_CONSECUTIVE_DAYS) {
            rawScores.consecutive = 60;
            factors.push(`${daysSinceLastLeave} consecutive days without leave (moderate)`);
        } else {
            rawScores.consecutive = Math.max(0, (daysSinceLastLeave / THRESHOLDS.HIGH_CONSECUTIVE_DAYS) * 40);
            factors.push(`${daysSinceLastLeave} consecutive days without leave`);
        }

        // ━━━ Factor 2: Leave utilization ratio ━━━
        const totalBalance = Object.values(user.leaveBalance || {}).reduce((sum, v) => sum + v, 0);
        const totalAllocated = totalBalance + user.totalLeaveTaken;
        const utilizationRatio = totalAllocated > 0 ? user.totalLeaveTaken / totalAllocated : 0;

        if (utilizationRatio < THRESHOLDS.LOW_UTILIZATION_RATIO) {
            rawScores.utilization = 80;
            factors.push(`Leave utilization at ${Math.round(utilizationRatio * 100)}% — below ${THRESHOLDS.LOW_UTILIZATION_RATIO * 100}% threshold (leave hoarding indicator)`);
        } else if (utilizationRatio < 0.4) {
            rawScores.utilization = 40;
            factors.push(`Leave utilization at ${Math.round(utilizationRatio * 100)}% — moderate usage`);
        } else {
            rawScores.utilization = 10;
            factors.push(`Leave utilization at ${Math.round(utilizationRatio * 100)}% — healthy`);
        }

        // ━━━ Factor 3: Leave frequency in past 3 months ━━━
        const threeMonthsAgo = subMonths(now, 3);
        const recentLeaves = await Leave.countDocuments({
            employee: employeeId,
            status: 'approved',
            appliedAt: { $gte: threeMonthsAgo },
        });

        // Sudden spike or none at all can indicate issues
        if (recentLeaves === 0) {
            rawScores.frequency = 70;
            factors.push('No leaves taken in the past 3 months');
        } else if (recentLeaves >= 5) {
            rawScores.frequency = 60;
            factors.push(`${recentLeaves} leaves in past 3 months — potential stress indicator`);
        } else {
            rawScores.frequency = 15;
            factors.push(`${recentLeaves} leave(s) in past 3 months — normal pattern`);
        }

        // ━━━ Factor 4: Sick leave frequency ━━━
        const sickLeavesRecent = await Leave.countDocuments({
            employee: employeeId,
            leaveType: 'sick',
            status: 'approved',
            appliedAt: { $gte: subMonths(now, 1) },
        });

        if (sickLeavesRecent >= THRESHOLDS.HIGH_SICK_FREQUENCY) {
            rawScores.sickLeave = 90;
            factors.push(`${sickLeavesRecent} sick leaves this month (threshold: ${THRESHOLDS.HIGH_SICK_FREQUENCY})`);
        } else if (sickLeavesRecent >= 2) {
            rawScores.sickLeave = 50;
            factors.push(`${sickLeavesRecent} sick leave(s) this month`);
        } else {
            rawScores.sickLeave = 5;
            factors.push(`${sickLeavesRecent} sick leave(s) this month — normal`);
        }

        // ━━━ Calculate weighted final score ━━━
        const finalScore = Math.round(
            rawScores.consecutive * FACTORS.CONSECUTIVE_DAYS_WEIGHT +
            rawScores.utilization * FACTORS.UTILIZATION_WEIGHT +
            rawScores.frequency * FACTORS.FREQUENCY_WEIGHT +
            rawScores.sickLeave * FACTORS.SICK_LEAVE_WEIGHT
        );

        // Categorize the score
        let category;
        if (finalScore <= 30) category = 'Low';
        else if (finalScore <= 60) category = 'Moderate';
        else if (finalScore <= 80) category = 'High';
        else category = 'Critical';

        // Generate recommendations based on score
        const recommendations = [];
        if (finalScore > 60) {
            recommendations.push('Consider taking a break soon to maintain well-being');
            recommendations.push('Review workload distribution with your manager');
        }
        if (rawScores.consecutive > 60) {
            recommendations.push('Schedule a short leave to reset — even 1-2 days helps');
        }
        if (rawScores.utilization > 50) {
            recommendations.push('You have unused leave balance — plan time off proactively');
        }

        // Store insight for history
        await AIInsight.create({
            employee: employeeId,
            insightType: 'burnout',
            score: finalScore,
            message: `Burnout risk: ${category} (${finalScore}/100)`,
            recommendations,
        });

        return {
            score: finalScore,
            category,
            factors,
            recommendations,
            weights: FACTORS,
            rawScores,
            label: 'Rule-Based Burnout Assessment',
        };
    } catch (error) {
        logger.error(`Burnout calculation error: ${error.message}`);
        return { score: 0, category: 'Error', factors: ['Unable to calculate'], recommendations: [] };
    }
};

// Calculates burnout scores for all team members under a manager
const getTeamBurnout = async (managerId) => {
    try {
        const manager = await User.findById(managerId);
        if (!manager) {
            return { team: [], averageScore: 0 };
        }

        // Get all employees in the manager's department
        const teamMembers = await User.find({
            department: manager.department,
            isActive: true,
            _id: { $ne: managerId },
        }).select('name email avatar');

        // Calculate burnout for each team member
        const teamScores = await Promise.all(
            teamMembers.map(async (member) => {
                const burnout = await calculateBurnoutScore(member._id);
                return {
                    employee: { _id: member._id, name: member.name, email: member.email, avatar: member.avatar },
                    score: burnout.score,
                    category: burnout.category,
                };
            })
        );

        // Sort by highest burnout score first
        teamScores.sort((a, b) => b.score - a.score);

        const averageScore = teamScores.length > 0
            ? Math.round(teamScores.reduce((sum, t) => sum + t.score, 0) / teamScores.length)
            : 0;

        return {
            team: teamScores,
            averageScore,
            teamSize: teamScores.length,
            highRiskCount: teamScores.filter((t) => t.score > 60).length,
            label: 'Rule-Based Team Assessment',
        };
    } catch (error) {
        logger.error(`Team burnout error: ${error.message}`);
        return { team: [], averageScore: 0 };
    }
};

module.exports = { calculateBurnoutScore, getTeamBurnout };

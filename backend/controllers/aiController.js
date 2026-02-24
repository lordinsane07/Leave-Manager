const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/authMiddleware');
const { getLeaveAdvice, getRejectionReason } = require('../services/aiService');
const { calculateBurnoutScore, getTeamBurnout } = require('../services/burnoutService');
const { parseNaturalLanguageLeave } = require('../services/nlpService');
const { getSmartSuggestions, getTrendForecast } = require('../services/leaveBalanceService');
const logger = require('../utils/logger');

// ━━━ POST /api/ai/leave-advice — Get heuristic-based leave timing advice ━━━
const getLeaveAdviceHandler = asyncHandler(async (req, res) => {
    const { requestedDates, leaveType } = req.body;
    const employeeId = req.user._id;

    const advice = await getLeaveAdvice(employeeId, requestedDates, leaveType);

    return ApiResponse.ok(res, 'Leave advice generated (heuristic-based)', { advice });
});

// ━━━ GET /api/ai/burnout/:employeeId — Get burnout score for employee ━━━
const getBurnoutScore = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;

    // Employees can only check their own score; managers/admins can check anyone
    if (req.user.role === 'employee' && req.user._id.toString() !== employeeId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const burnout = await calculateBurnoutScore(employeeId);

    return ApiResponse.ok(res, 'Burnout score calculated (rule-based)', { burnout });
});

// ━━━ GET /api/ai/burnout/team/:managerId — Get team burnout overview ━━━
const getTeamBurnoutHandler = asyncHandler(async (req, res) => {
    const { managerId } = req.params;

    const teamBurnout = await getTeamBurnout(managerId);

    return ApiResponse.ok(res, 'Team burnout overview (rule-based)', { teamBurnout });
});

// ━━━ POST /api/ai/parse-leave — Parse natural language into leave data ━━━
const parseLeaveInput = asyncHandler(async (req, res) => {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Text input is required' });
    }

    const parsed = parseNaturalLanguageLeave(text);

    return ApiResponse.ok(res, 'Leave text parsed', { parsed });
});

// ━━━ POST /api/ai/rejection-reason — Generate professional rejection reason ━━━
const getRejectionReasonHandler = asyncHandler(async (req, res) => {
    const { leaveId, reason } = req.body;

    const suggestion = await getRejectionReason(leaveId, reason);

    return ApiResponse.ok(res, 'Rejection reason generated', { suggestion });
});

// ━━━ GET /api/ai/suggestions/:employeeId — Smart leave suggestions ━━━
const getSmartSuggestionsHandler = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;

    const suggestions = await getSmartSuggestions(employeeId);

    return ApiResponse.ok(res, 'Smart suggestions generated (data-driven)', { suggestions });
});

// ━━━ GET /api/ai/predictions — Trend-based forecast (decision support) ━━━
const getPredictionsHandler = asyncHandler(async (req, res) => {
    const { department, months = 3 } = req.query;

    const forecast = await getTrendForecast(department, parseInt(months, 10));

    return ApiResponse.ok(res, 'Trend-Based Forecast (Decision Support)', { forecast });
});

module.exports = {
    getLeaveAdviceHandler,
    getBurnoutScore,
    getTeamBurnoutHandler,
    parseLeaveInput,
    getRejectionReasonHandler,
    getSmartSuggestionsHandler,
    getPredictionsHandler,
};

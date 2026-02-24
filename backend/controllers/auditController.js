const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/authMiddleware');

// ━━━ GET /api/audit — List audit logs with filtering and pagination ━━━
const getAuditLogs = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        action,
        actor,
        targetModel,
        from,
        to,
        sortBy = 'timestamp',
        order = 'desc',
    } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (actor) filter.actor = actor;
    if (targetModel) filter.targetModel = targetModel;

    // Date range filter
    if (from || to) {
        filter.timestamp = {};
        if (from) filter.timestamp.$gte = new Date(from);
        if (to) filter.timestamp.$lte = new Date(to);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sortObj = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [logs, total] = await Promise.all([
        AuditLog.find(filter)
            .populate('actor', 'name email role')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit, 10)),
        AuditLog.countDocuments(filter),
    ]);

    // Flag entries older than 1 year as eligible for archiving
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const enrichedLogs = logs.map((log) => ({
        ...log.toObject(),
        isArchiveEligible: log.timestamp < oneYearAgo,
    }));

    return ApiResponse.ok(res, 'Audit logs retrieved', { logs: enrichedLogs }, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
    });
});

// ━━━ GET /api/audit/:id — Get single audit log entry ━━━
const getAuditLogById = asyncHandler(async (req, res) => {
    const log = await AuditLog.findById(req.params.id)
        .populate('actor', 'name email role');

    if (!log) {
        throw ApiError.notFound('Audit log entry not found');
    }

    return ApiResponse.ok(res, 'Audit log retrieved', { log });
});

// ━━━ GET /api/audit/export — Export audit logs as JSON (for CSV conversion on frontend) ━━━
const exportAuditLogs = asyncHandler(async (req, res) => {
    const { action, actor, targetModel, from, to } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (actor) filter.actor = actor;
    if (targetModel) filter.targetModel = targetModel;
    if (from || to) {
        filter.timestamp = {};
        if (from) filter.timestamp.$gte = new Date(from);
        if (to) filter.timestamp.$lte = new Date(to);
    }

    const logs = await AuditLog.find(filter)
        .populate('actor', 'name email role')
        .sort({ timestamp: -1 })
        .limit(5000); // Hard cap for export

    return ApiResponse.ok(res, 'Audit logs exported', { logs, count: logs.length });
});

module.exports = {
    getAuditLogs,
    getAuditLogById,
    exportAuditLogs,
};

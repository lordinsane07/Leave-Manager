const { validationResult } = require('express-validator');
const Holiday = require('../models/Holiday');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/authMiddleware');
const { createAuditEntry } = require('../middleware/auditLogger');

// ━━━ GET /api/holidays — List holidays with optional year filter ━━━
const getHolidays = asyncHandler(async (req, res) => {
    const { year, type, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (year) filter.year = parseInt(year, 10);
    if (type) filter.type = type;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [holidays, total] = await Promise.all([
        Holiday.find(filter)
            .sort({ date: 1 })
            .skip(skip)
            .limit(parseInt(limit, 10)),
        Holiday.countDocuments(filter),
    ]);

    return ApiResponse.ok(res, 'Holidays retrieved', { holidays }, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
    });
});

// ━━━ POST /api/holidays — Create holiday (admin only) ━━━
const createHoliday = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ApiError.badRequest('Validation failed', errors.array().map((e) => e.msg));
    }

    const { name, date, type, isRecurring } = req.body;

    const holiday = await Holiday.create({
        name,
        date,
        type: type || 'national',
        isRecurring: isRecurring || false,
        year: new Date(date).getFullYear(),
    });

    await createAuditEntry({
        actor: req.user._id,
        action: 'CREATE',
        targetModel: 'Holiday',
        targetId: holiday._id,
        changes: { before: null, after: { name, date } },
        req,
    });

    return ApiResponse.created(res, 'Holiday created', { holiday });
});

// ━━━ PUT /api/holidays/:id — Update holiday (admin only) ━━━
const updateHoliday = asyncHandler(async (req, res) => {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
        throw ApiError.notFound('Holiday not found');
    }

    const { name, date, type, isRecurring } = req.body;
    const before = { name: holiday.name, date: holiday.date };

    if (name) holiday.name = name;
    if (date) {
        holiday.date = date;
        holiday.year = new Date(date).getFullYear();
    }
    if (type) holiday.type = type;
    if (isRecurring !== undefined) holiday.isRecurring = isRecurring;

    await holiday.save();

    await createAuditEntry({
        actor: req.user._id,
        action: 'UPDATE',
        targetModel: 'Holiday',
        targetId: holiday._id,
        changes: { before, after: { name: holiday.name, date: holiday.date } },
        req,
    });

    return ApiResponse.ok(res, 'Holiday updated', { holiday });
});

// ━━━ DELETE /api/holidays/:id — Delete holiday (admin only) ━━━
const deleteHoliday = asyncHandler(async (req, res) => {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
        throw ApiError.notFound('Holiday not found');
    }

    await holiday.deleteOne();

    await createAuditEntry({
        actor: req.user._id,
        action: 'DELETE',
        targetModel: 'Holiday',
        targetId: holiday._id,
        changes: { before: { name: holiday.name, date: holiday.date }, after: null },
        req,
    });

    return ApiResponse.ok(res, 'Holiday deleted');
});

module.exports = {
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
};

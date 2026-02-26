const { validationResult } = require('express-validator');
const Department = require('../models/Department');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/authMiddleware');
const { createAuditEntry } = require('../middleware/auditLogger');

// ━━━ GET /api/departments — List all departments ━━━
const getDepartments = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;
    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
        ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [departments, total] = await Promise.all([
        Department.find(filter)
            .populate('manager', 'name email')
            .sort({ name: 1 })
            .skip(skip)
            .limit(parseInt(limit, 10)),
        Department.countDocuments(filter),
    ]);

    // Attach employee count to each department
    const enriched = await Promise.all(
        departments.map(async (dept) => {
            const employeeCount = await User.countDocuments({ department: dept._id, isActive: true });
            return { ...dept.toObject(), employeeCount };
        })
    );

    return ApiResponse.ok(res, 'Departments retrieved', { departments: enriched }, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
    });
});

// ━━━ GET /api/departments/:id — Get single department with employees ━━━
const getDepartmentById = asyncHandler(async (req, res) => {
    const department = await Department.findById(req.params.id)
        .populate('manager', 'name email avatar')
        .populate('employees', 'name email avatar role');

    if (!department) {
        throw ApiError.notFound('Department not found');
    }

    const employeeCount = await User.countDocuments({ department: department._id, isActive: true });

    return ApiResponse.ok(res, 'Department retrieved', {
        department: { ...department.toObject(), employeeCount },
    });
});

// ━━━ POST /api/departments — Create new department (admin only) ━━━
const createDepartment = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ApiError.badRequest('Validation failed', errors.array().map((e) => e.msg));
    }

    const { name, code, manager, leavePolicy } = req.body;

    // Check for duplicate name or code
    const existing = await Department.findOne({ $or: [{ name }, { code: code.toUpperCase() }] });
    if (existing) {
        throw ApiError.conflict('Department with this name or code already exists');
    }

    const department = await Department.create({
        name,
        code: code.toUpperCase(),
        manager: manager || null,
        leavePolicy: leavePolicy || undefined,
    });

    await createAuditEntry({
        actor: req.user._id,
        action: 'CREATE',
        targetModel: 'Department',
        targetId: department._id,
        changes: { before: null, after: { name, code } },
        req,
    });

    return ApiResponse.created(res, 'Department created', { department });
});

// ━━━ PUT /api/departments/:id — Update department (admin only) ━━━
const updateDepartment = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ApiError.badRequest('Validation failed', errors.array().map((e) => e.msg));
    }

    const department = await Department.findById(req.params.id);
    if (!department) {
        throw ApiError.notFound('Department not found');
    }

    const before = { name: department.name, code: department.code };
    const { name, code, manager, leavePolicy } = req.body;

    // Check for duplicate name or code (exclude self)
    if (name || code) {
        const dupFilter = { _id: { $ne: department._id } };
        const orConditions = [];
        if (name) orConditions.push({ name });
        if (code) orConditions.push({ code: code.toUpperCase() });
        if (orConditions.length > 0) {
            dupFilter.$or = orConditions;
            const duplicate = await Department.findOne(dupFilter);
            if (duplicate) {
                throw ApiError.conflict('Another department with this name or code already exists');
            }
        }
    }

    if (name) department.name = name;
    if (code) department.code = code.toUpperCase();
    if (manager !== undefined) department.manager = manager;
    if (leavePolicy) department.leavePolicy = { ...department.leavePolicy, ...leavePolicy };

    await department.save();

    await createAuditEntry({
        actor: req.user._id,
        action: 'UPDATE',
        targetModel: 'Department',
        targetId: department._id,
        changes: { before, after: { name: department.name, code: department.code } },
        req,
    });

    return ApiResponse.ok(res, 'Department updated', { department });
});

// ━━━ DELETE /api/departments/:id — Delete department (admin only) ━━━
const deleteDepartment = asyncHandler(async (req, res) => {
    const department = await Department.findById(req.params.id);
    if (!department) {
        throw ApiError.notFound('Department not found');
    }

    // Prevent deletion if department still has active employees
    const employeeCount = await User.countDocuments({ department: department._id, isActive: true });
    if (employeeCount > 0) {
        throw ApiError.badRequest(`Cannot delete — department still has ${employeeCount} active employee(s)`);
    }

    await department.deleteOne();

    await createAuditEntry({
        actor: req.user._id,
        action: 'DELETE',
        targetModel: 'Department',
        targetId: department._id,
        changes: { before: { name: department.name, code: department.code }, after: null },
        req,
    });

    return ApiResponse.ok(res, 'Department deleted');
});

module.exports = {
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
};

const { validationResult } = require('express-validator');
const User = require('../models/User');
const Department = require('../models/Department');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/authMiddleware');
const { createAuditEntry } = require('../middleware/auditLogger');
const logger = require('../utils/logger');

// ━━━ GET /api/users — List all users with pagination (admin/manager) ━━━
const getUsers = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        role,
        department,
        search,
        sortBy = 'createdAt',
        order = 'desc',
        isActive,
    } = req.query;

    const filter = {};

    // Managers only see users in their department
    if (req.user.role === 'manager') {
        filter.department = req.user.department;
    }

    if (role) filter.role = role;
    if (department && req.user.role === 'admin') filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Text search across name and email
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sortObj = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
        User.find(filter)
            .populate('department', 'name code')
            .populate('managerId', 'name email')
            .select('-password -refreshToken')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit, 10)),
        User.countDocuments(filter),
    ]);

    return ApiResponse.ok(res, 'Users retrieved', { users }, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
    });
});

// ━━━ GET /api/users/:id — Get single user profile ━━━
const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
        .populate('department', 'name code')
        .populate('managerId', 'name email')
        .select('-password -refreshToken');

    if (!user) {
        throw ApiError.notFound('User not found');
    }

    return ApiResponse.ok(res, 'User retrieved', { user });
});

// ━━━ PUT /api/users/profile — Update own profile ━━━
const updateProfile = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ApiError.badRequest('Validation failed', errors.array().map((e) => e.msg));
    }

    const { name, email, avatar } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;

    // Verify email uniqueness if being changed
    if (email && email !== req.user.email) {
        const existing = await User.findOne({ email });
        if (existing) {
            throw ApiError.conflict('Email already in use');
        }
        updates.email = email;
    }

    const before = { name: req.user.name, email: req.user.email };
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
    }).select('-password -refreshToken');

    await createAuditEntry({
        actor: req.user._id,
        action: 'UPDATE',
        targetModel: 'User',
        targetId: req.user._id,
        changes: { before, after: updates },
        req,
    });

    return ApiResponse.ok(res, 'Profile updated', { user });
});

// ━━━ PATCH /api/users/:id/role — Assign role to user (admin only) ━━━
const assignRole = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ApiError.badRequest('Validation failed', errors.array().map((e) => e.msg));
    }

    const { role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
        throw ApiError.notFound('User not found');
    }

    const previousRole = user.role;
    user.role = role;
    await user.save({ validateBeforeSave: false });

    await createAuditEntry({
        actor: req.user._id,
        action: 'ROLE_CHANGE',
        targetModel: 'User',
        targetId: user._id,
        changes: { before: { role: previousRole }, after: { role } },
        req,
    });

    logger.info(`Role changed for ${user.email}: ${previousRole} → ${role}`);

    return ApiResponse.ok(res, `Role updated to ${role}`, { user: { _id: user._id, name: user.name, role: user.role } });
});

// ━━━ PATCH /api/users/:id/deactivate — Deactivate user (admin only) ━━━
const deactivateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw ApiError.notFound('User not found');
    }

    // Prevent self-deactivation
    if (user._id.toString() === req.user._id.toString()) {
        throw ApiError.badRequest('Cannot deactivate your own account');
    }

    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    await createAuditEntry({
        actor: req.user._id,
        action: 'UPDATE',
        targetModel: 'User',
        targetId: user._id,
        changes: { before: { isActive: true }, after: { isActive: false } },
        req,
    });

    return ApiResponse.ok(res, 'User deactivated', { user: { _id: user._id, name: user.name, isActive: false } });
});

// ━━━ PUT /api/users/:id/manager — Assign manager to employee (admin only) ━━━
const assignManager = asyncHandler(async (req, res) => {
    const { managerId } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
        throw ApiError.notFound('User not found');
    }

    if (managerId) {
        const manager = await User.findById(managerId);
        if (!manager || manager.role !== 'manager') {
            throw ApiError.badRequest('Specified manager not found or is not a manager');
        }
    }

    user.managerId = managerId || null;
    await user.save({ validateBeforeSave: false });

    return ApiResponse.ok(res, 'Manager assigned', { user: { _id: user._id, name: user.name, managerId: user.managerId } });
});

// ━━━ PATCH /api/users/:id/department — Assign department to user (admin only) ━━━
const assignDepartment = asyncHandler(async (req, res) => {
    const { departmentId } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
        throw ApiError.notFound('User not found');
    }

    const previousDept = user.department;

    if (departmentId) {
        const dept = await Department.findById(departmentId);
        if (!dept) {
            throw ApiError.badRequest('Department not found');
        }

        // Remove user from previous department's employee list
        if (previousDept) {
            await Department.findByIdAndUpdate(previousDept, { $pull: { employees: user._id } });
        }

        // Add user to new department's employee list
        await Department.findByIdAndUpdate(departmentId, { $addToSet: { employees: user._id } });

        user.department = departmentId;
    } else {
        // Remove from current department
        if (previousDept) {
            await Department.findByIdAndUpdate(previousDept, { $pull: { employees: user._id } });
        }
        user.department = null;
    }

    await user.save({ validateBeforeSave: false });

    const updatedUser = await User.findById(user._id)
        .populate('department', 'name code')
        .populate('managerId', 'name email')
        .select('-password -refreshToken');

    await createAuditEntry({
        actor: req.user._id,
        action: 'UPDATE',
        targetModel: 'User',
        targetId: user._id,
        changes: { before: { department: previousDept }, after: { department: departmentId } },
        req,
    });

    return ApiResponse.ok(res, 'Department assigned', { user: updatedUser });
});

// ━━━ POST /api/users/avatar — Upload profile picture to Cloudinary ━━━
const uploadAvatarHandler = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw ApiError.badRequest('No image file provided');
    }

    const { uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');

    // Upload new avatar to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, req.user._id);
    const avatarUrl = result.secure_url;

    // Delete old avatar from Cloudinary if it exists
    if (req.user.avatar && req.user.avatar.includes('cloudinary')) {
        // Extract public_id from old URL
        const parts = req.user.avatar.split('/');
        const folderAndFile = parts.slice(parts.indexOf('leave-manager')).join('/');
        const publicId = folderAndFile.replace(/\.[^.]+$/, ''); // Remove extension
        await deleteFromCloudinary(publicId);
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: avatarUrl },
        { new: true }
    ).select('-password -refreshToken');

    return ApiResponse.ok(res, 'Avatar updated', { user });
});

module.exports = {
    getUsers,
    getUserById,
    updateProfile,
    assignRole,
    deactivateUser,
    assignManager,
    assignDepartment,
    uploadAvatarHandler,
};

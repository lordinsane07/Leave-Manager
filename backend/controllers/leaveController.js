const { validationResult } = require('express-validator');
const { startOfDay, parseISO } = require('date-fns');
const Leave = require('../models/Leave');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/authMiddleware');
const { createAuditEntry } = require('../middleware/auditLogger');
const { calculateLeaveDays, hasOverlap, validateBalance } = require('../utils/leaveCalculator');
const { getIO } = require('../config/socket');
const { sendLeaveApplicationEmail, sendLeaveStatusEmail } = require('../services/emailService');
const logger = require('../utils/logger');

// ━━━ POST /api/leaves — Apply for leave ━━━
const applyLeave = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ApiError.badRequest('Validation failed', errors.array().map((e) => e.msg));
    }

    const { leaveType, startDate, endDate, reason, isUrgent } = req.body;
    const employeeId = req.user._id;

    // ━━━ Date validation using server time ━━━
    const start = startOfDay(typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate));
    const end = startOfDay(typeof endDate === 'string' ? parseISO(endDate) : new Date(endDate));
    const today = startOfDay(new Date());
    const currentYear = today.getFullYear();

    // Rule 1: Start date must be on or before end date
    if (start > end) {
        throw ApiError.badRequest('Start date must be on or before end date');
    }

    // Rule 2: Leave cannot be applied for past dates
    if (start < today) {
        throw ApiError.badRequest('Leave cannot be applied for past dates');
    }

    // Rule 3: Leave dates must be within the current calendar year
    if (start.getFullYear() !== currentYear || end.getFullYear() !== currentYear) {
        throw ApiError.badRequest(
            `Leave dates must be within the current year (${currentYear}). Cross-year applications are not allowed.`
        );
    }

    // Fetch holidays to exclude from working day calculation
    const holidays = await Holiday.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    // Calculate actual working days excluding weekends and holidays
    const totalDays = calculateLeaveDays(startDate, endDate, holidays);
    if (totalDays <= 0) {
        throw ApiError.badRequest('No working days in the selected date range');
    }

    // Verify sufficient leave balance and check department limits
    const user = await User.findById(employeeId).populate('department');
    if (!validateBalance(user.leaveBalance, leaveType, totalDays)) {
        throw ApiError.badRequest(
            `Insufficient ${leaveType} leave balance. Available: ${user.leaveBalance[leaveType]}, Requested: ${totalDays}`
        );
    }

    // Enforce max consecutive days limit based on department policy
    // Skip for maternity and paternity as they have logical bounds based on balance.
    if (!['maternity', 'paternity'].includes(leaveType)) {
        const maxDays = user.department?.leavePolicy?.maxConsecutiveDays || 15;
        if (totalDays > maxDays) {
            throw ApiError.badRequest(
                `Maximum ${maxDays} consecutive working days allowed for ${leaveType} leave per department policy. Requested: ${totalDays}`
            );
        }
    }

    // Check for overlapping approved or pending leaves
    const existingLeaves = await Leave.find({
        employee: employeeId,
        status: { $in: ['pending', 'approved'] },
    });

    if (hasOverlap(startDate, endDate, existingLeaves)) {
        throw ApiError.conflict('Leave dates overlap with an existing application');
    }

    // Create the leave record
    const leave = await Leave.create({
        employee: employeeId,
        leaveType,
        startDate,
        endDate,
        totalDays,
        reason,
        isUrgent: isUrgent || false,
    });

    // Send response immediately — don't block on email/socket/audit
    ApiResponse.created(res, 'Leave application submitted successfully', { leave });

    // Run background tasks (email, socket, audit) without blocking the response
    setImmediate(async () => {
        try {
            if (user.managerId) {
                const manager = await User.findById(user.managerId).select('email name');

                if (manager) {
                    try {
                        await sendLeaveApplicationEmail(
                            manager.email,
                            user.name,
                            leaveType,
                            totalDays,
                            new Date(startDate).toLocaleDateString()
                        );
                    } catch (emailErr) {
                        logger.error(`Failed to send leave application email to manager: ${emailErr.message}`);
                    }
                }
                const notification = await Notification.create({
                    recipient: user.managerId,
                    type: 'leave_submitted',
                    message: `${user.name} has applied for ${totalDays} day(s) of ${leaveType} leave`,
                    data: { leaveId: leave._id, employeeName: user.name, leaveType, totalDays },
                });

                try {
                    const io = getIO();
                    io.to(`user-${user.managerId}`).emit('leave:submitted', notification);
                } catch (socketErr) {
                    logger.warn(`Socket notification failed: ${socketErr.message}`);
                }
            }

            await createAuditEntry({
                actor: employeeId,
                action: 'CREATE',
                targetModel: 'Leave',
                targetId: leave._id,
                changes: { before: null, after: { leaveType, startDate, endDate, totalDays, status: 'pending' } },
                req,
            });
        } catch (bgErr) {
            logger.error(`Background task error (applyLeave): ${bgErr.message}`);
        }
    });
});

// ━━━ GET /api/leaves — List leaves with pagination, filtering, sorting ━━━
const getLeaves = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        status,
        leaveType,
        from,
        to,
        sortBy = 'createdAt',
        order = 'desc',
        employee,
    } = req.query;

    // Build dynamic filter object
    const filter = {};

    // Role-based filtering: employees see only their own, managers see their department
    if (req.user.role === 'employee') {
        filter.employee = req.user._id;
    } else if (req.user.role === 'manager') {
        if (employee) {
            // Specific employee requested (e.g. from My Leaves page)
            filter.employee = employee;
        } else {
            // Team view — show department employees but EXCLUDE the manager's own leaves
            const deptEmployees = await User.find({ department: req.user.department }).select('_id');
            const teamIds = deptEmployees.map((e) => e._id).filter(id => id.toString() !== req.user._id.toString());
            filter.employee = { $in: teamIds };
        }
    } else if (employee) {
        // Admin can filter by specific employee
        filter.employee = employee;
    }

    if (status) filter.status = status;
    if (leaveType) filter.leaveType = leaveType;
    if (from || to) {
        filter.startDate = {};
        if (from) filter.startDate.$gte = new Date(from);
        if (to) filter.startDate.$lte = new Date(to);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sortObj = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [leaves, total] = await Promise.all([
        Leave.find(filter)
            .populate('employee', 'name email avatar department')
            .populate('approvedBy', 'name email')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit, 10)),
        Leave.countDocuments(filter),
    ]);

    return ApiResponse.ok(res, 'Leaves retrieved', { leaves }, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
    });
});

// ━━━ GET /api/leaves/:id — Get single leave detail ━━━
const getLeaveById = asyncHandler(async (req, res) => {
    const leave = await Leave.findById(req.params.id)
        .populate('employee', 'name email avatar department')
        .populate('approvedBy', 'name email');

    if (!leave) {
        throw ApiError.notFound('Leave application not found');
    }

    // Employees can only view their own leaves
    if (req.user.role === 'employee' && leave.employee._id.toString() !== req.user._id.toString()) {
        throw ApiError.forbidden('You can only view your own leave applications');
    }

    return ApiResponse.ok(res, 'Leave retrieved', { leave });
});

// ━━━ PATCH /api/leaves/:id/status — Approve or reject leave (manager/admin) ━━━
const updateLeaveStatus = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ApiError.badRequest('Validation failed', errors.array().map((e) => e.msg));
    }

    const { status, managerComment } = req.body;
    const leave = await Leave.findById(req.params.id).populate('employee', 'name email managerId department leaveBalance totalLeaveTaken');

    if (!leave) {
        throw ApiError.notFound('Leave application not found');
    }

    if (leave.status !== 'pending') {
        throw ApiError.badRequest(`Leave is already ${leave.status}`);
    }

    // Managers cannot approve/reject their own leaves — only admin can
    if (req.user.role === 'manager' && leave.employee._id.toString() === req.user._id.toString()) {
        throw ApiError.forbidden('You cannot approve or reject your own leave. Only an admin can process your request.');
    }

    // Managers may only process leaves from their own department
    if (req.user.role === 'manager') {
        const empDept = leave.employee.department;
        const mgrDept = req.user.department;
        // Handle both populated (object with _id) and unpopulated (ObjectId) formats
        const employeeDeptId = (empDept?._id || empDept)?.toString();
        const managerDeptId = (mgrDept?._id || mgrDept)?.toString();
        if (employeeDeptId !== managerDeptId) {
            throw ApiError.forbidden('You can only manage leaves in your department');
        }
    }

    const previousStatus = leave.status;
    leave.status = status;
    leave.approvedBy = req.user._id;
    leave.managerComment = managerComment || '';
    leave.processedAt = new Date();
    leave.notificationSent = true;

    // If approved, deduct from employee's leave balance
    if (status === 'approved') {
        await User.findByIdAndUpdate(leave.employee._id, {
            $inc: {
                [`leaveBalance.${leave.leaveType}`]: -leave.totalDays,
                totalLeaveTaken: leave.totalDays,
            },
        });
    }

    await leave.save();

    // Send response immediately — don't block on email/socket/audit
    ApiResponse.ok(res, `Leave ${status} successfully`, { leave });

    // Run background tasks (email, socket, audit) without blocking the response
    setImmediate(async () => {
        try {
            const notificationType = status === 'approved' ? 'leave_approved' : 'leave_rejected';
            const notificationMessage = status === 'approved'
                ? `Your ${leave.leaveType} leave has been approved by ${req.user.name}`
                : `Your ${leave.leaveType} leave has been rejected by ${req.user.name}. ${managerComment ? `Reason: ${managerComment}` : ''}`;

            const notification = await Notification.create({
                recipient: leave.employee._id,
                type: notificationType,
                message: notificationMessage,
                data: { leaveId: leave._id, status, managerComment },
            });

            try {
                const io = getIO();
                const eventName = status === 'approved' ? 'leave:approved' : 'leave:rejected';
                io.to(`user-${leave.employee._id}`).emit(eventName, notification);
            } catch (socketErr) {
                logger.warn(`Socket notification failed: ${socketErr.message}`);
            }

            try {
                if (leave.employee.email) {
                    await sendLeaveStatusEmail(
                        leave.employee.email,
                        leave.employee.name,
                        leave.leaveType,
                        status,
                        managerComment || ''
                    );
                }
            } catch (emailErr) {
                logger.error(`Failed to send leave status email to employee: ${emailErr.message}`);
            }

            await createAuditEntry({
                actor: req.user._id,
                action: status === 'approved' ? 'APPROVE' : 'REJECT',
                targetModel: 'Leave',
                targetId: leave._id,
                changes: { before: { status: previousStatus }, after: { status, managerComment } },
                req,
            });
        } catch (bgErr) {
            logger.error(`Background task error (updateLeaveStatus): ${bgErr.message}`);
        }
    });
});

// ━━━ PATCH /api/leaves/:id/cancel — Cancel own pending leave ━━━
const cancelLeave = asyncHandler(async (req, res) => {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
        throw ApiError.notFound('Leave application not found');
    }

    // Only the applicant can cancel their own leave
    if (leave.employee.toString() !== req.user._id.toString()) {
        throw ApiError.forbidden('You can only cancel your own leave applications');
    }

    if (leave.status === 'cancelled') {
        throw ApiError.badRequest('Leave is already cancelled');
    }

    const previousStatus = leave.status;

    // If the leave was already approved, refund the balance
    if (leave.status === 'approved') {
        await User.findByIdAndUpdate(req.user._id, {
            $inc: {
                [`leaveBalance.${leave.leaveType}`]: leave.totalDays,
                totalLeaveTaken: -leave.totalDays,
            },
        });
    }

    leave.status = 'cancelled';
    leave.processedAt = new Date();
    await leave.save();

    // Notify manager about cancellation
    if (req.user.managerId) {
        const notification = await Notification.create({
            recipient: req.user.managerId,
            type: 'leave_cancelled',
            message: `${req.user.name} has cancelled their ${leave.leaveType} leave`,
            data: { leaveId: leave._id },
        });

        try {
            const io = getIO();
            io.to(`user-${req.user.managerId}`).emit('leave:cancelled', notification);
        } catch (socketErr) {
            logger.warn(`Socket notification failed: ${socketErr.message}`);
        }
    }

    await createAuditEntry({
        actor: req.user._id,
        action: 'CANCEL',
        targetModel: 'Leave',
        targetId: leave._id,
        changes: { before: { status: previousStatus }, after: { status: 'cancelled' } },
        req,
    });

    return ApiResponse.ok(res, 'Leave cancelled successfully', { leave });
});

module.exports = {
    applyLeave,
    getLeaves,
    getLeaveById,
    updateLeaveStatus,
    cancelLeave,
};

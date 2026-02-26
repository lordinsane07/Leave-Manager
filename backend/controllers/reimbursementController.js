const Reimbursement = require('../models/Reimbursement');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// ━━━ POST /api/reimbursements — Submit a new claim ━━━
const submitClaim = asyncHandler(async (req, res) => {
    const { category, amount, description, receiptUrl, expenseDate } = req.body;

    const claim = await Reimbursement.create({
        employee: req.user._id,
        category,
        amount,
        description,
        receiptUrl: receiptUrl || '',
        expenseDate,
    });

    logger.info(`Reimbursement claim submitted by ${req.user.name} — ₹${amount} (${category})`);

    return ApiResponse.created(res, 'Reimbursement claim submitted successfully', { claim });
});

// ━━━ GET /api/reimbursements — List claims (role-scoped) ━━━
const getAllClaims = asyncHandler(async (req, res) => {
    const { status, category, page = 1, limit = 10, sortBy = 'submittedAt', order = 'desc' } = req.query;

    const filter = {};

    // Role-based scoping
    if (req.user.role === 'employee') {
        filter.employee = req.user._id;
    } else if (req.user.role === 'manager') {
        // Manager sees their department's claims
        const teamMembers = await User.find({ department: req.user.department, isActive: true }).select('_id');
        filter.employee = { $in: teamMembers.map(m => m._id) };
    }
    // Admin sees all — no employee filter

    if (status) filter.status = status;
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Reimbursement.countDocuments(filter);

    const claims = await Reimbursement.find(filter)
        .populate('employee', 'name email avatar department')
        .populate('approvedBy', 'name')
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit));

    return ApiResponse.ok(res, 'Reimbursement claims', {
        claims,
    }, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
    });
});

// ━━━ GET /api/reimbursements/:id — Single claim ━━━
const getClaimById = asyncHandler(async (req, res) => {
    const claim = await Reimbursement.findById(req.params.id)
        .populate('employee', 'name email avatar')
        .populate('approvedBy', 'name');

    if (!claim) throw ApiError.notFound('Claim not found');

    // Employees can only see their own
    if (req.user.role === 'employee' && claim.employee._id.toString() !== req.user._id.toString()) {
        throw ApiError.forbidden('Not authorized to view this claim');
    }

    return ApiResponse.ok(res, 'Claim details', { claim });
});

// ━━━ PATCH /api/reimbursements/:id/status — Approve / Reject ━━━
// Two-level flow: Employee claims require Manager approval then Admin final approval.
// Manager claims go directly to Admin.
const updateStatus = asyncHandler(async (req, res) => {
    const { status, approverComment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        throw ApiError.badRequest('Status must be approved or rejected');
    }

    // Only manager or admin can approve/reject
    if (req.user.role === 'employee') {
        throw ApiError.forbidden('Employees cannot approve or reject claims');
    }

    const claim = await Reimbursement.findById(req.params.id).populate('employee', 'name email role');
    if (!claim) throw ApiError.notFound('Claim not found');

    // Valid statuses for processing
    if (!['pending', 'manager_approved'].includes(claim.status)) {
        throw ApiError.badRequest(`Cannot ${status} a claim that is already ${claim.status}`);
    }

    // Manager-specific guards
    if (req.user.role === 'manager') {
        // Managers cannot process claims that are already manager-approved (awaiting admin)
        if (claim.status === 'manager_approved') {
            throw ApiError.forbidden('This claim is already approved by a manager. Final approval can only be performed by Admin.');
        }
        // Managers cannot process other managers' claims
        if (claim.employee.role === 'manager') {
            throw ApiError.forbidden('Manager claims can only be processed by Admin');
        }
    }

    // Determine the resulting status
    let resultStatus = status;
    let responseMessage = `Claim ${status} successfully`;

    if (status === 'approved') {
        if (req.user.role === 'manager' && claim.employee.role === 'employee') {
            // Manager approving employee claim → intermediate state
            resultStatus = 'manager_approved';
            responseMessage = 'Reimbursement approved by Manager and forwarded to Admin for final approval';
        }
        // Admin approving (pending or manager_approved) → final approval
        // resultStatus stays 'approved'
    }
    // Rejection at any stage by manager or admin → final rejected

    claim.status = resultStatus;
    claim.approvedBy = req.user._id;
    claim.approverComment = approverComment || '';
    claim.processedAt = new Date();
    await claim.save();
    await claim.populate('employee', 'name email avatar department');
    await claim.populate('approvedBy', 'name');

    logger.info(`Reimbursement ${claim._id} ${resultStatus} by ${req.user.name} (${req.user.role})`);

    return ApiResponse.ok(res, responseMessage, { claim });
});

// ━━━ PATCH /api/reimbursements/:id/cancel — Employee cancels own ━━━
const cancelClaim = asyncHandler(async (req, res) => {
    const claim = await Reimbursement.findById(req.params.id);
    if (!claim) throw ApiError.notFound('Claim not found');

    if (claim.employee.toString() !== req.user._id.toString()) {
        throw ApiError.forbidden('You can only cancel your own claims');
    }

    if (!['pending', 'manager_approved'].includes(claim.status)) {
        throw ApiError.badRequest('Only pending or manager-approved claims can be cancelled');
    }

    claim.status = 'cancelled';
    claim.processedAt = new Date();
    await claim.save();

    logger.info(`Reimbursement ${claim._id} cancelled by ${req.user.name}`);

    return ApiResponse.ok(res, 'Claim cancelled', { claim });
});

// ━━━ GET /api/reimbursements/stats — Quick stats ━━━
const getStats = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.user.role === 'employee') {
        filter.employee = req.user._id;
    } else if (req.user.role === 'manager') {
        const teamMembers = await User.find({ department: req.user.department, isActive: true }).select('_id');
        filter.employee = { $in: teamMembers.map(m => m._id) };
    }

    const [pending, managerApproved, approved, totalApproved] = await Promise.all([
        Reimbursement.countDocuments({ ...filter, status: 'pending' }),
        Reimbursement.countDocuments({ ...filter, status: 'manager_approved' }),
        Reimbursement.countDocuments({ ...filter, status: 'approved' }),
        Reimbursement.aggregate([
            { $match: { ...filter, status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
    ]);

    return ApiResponse.ok(res, 'Reimbursement stats', {
        stats: {
            pending: pending + managerApproved,
            managerApproved,
            approved,
            totalApprovedAmount: totalApproved[0]?.total || 0,
        },
    });
});

module.exports = {
    submitClaim,
    getAllClaims,
    getClaimById,
    updateStatus,
    cancelClaim,
    getStats,
};

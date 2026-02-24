const { body, query, param } = require('express-validator');

// ━━━ Auth Validation Rules ━━━

// Validates registration input: name, email, password, role
const registerRules = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)
        .withMessage('Password must include uppercase, lowercase, number, and special character'),
    body('role')
        .optional()
        .isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
    body('department')
        .optional()
        .isMongoId().withMessage('Invalid department ID'),
];

// Validates login input: email and password
const loginRules = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required'),
];

// ━━━ Leave Validation Rules ━━━

// Validates leave application input
const leaveApplicationRules = [
    body('leaveType')
        .notEmpty().withMessage('Leave type is required')
        .isIn(['annual', 'sick', 'personal', 'maternity', 'paternity'])
        .withMessage('Invalid leave type'),
    body('startDate')
        .notEmpty().withMessage('Start date is required')
        .isISO8601().withMessage('Invalid start date format'),
    body('endDate')
        .notEmpty().withMessage('End date is required')
        .isISO8601().withMessage('Invalid end date format'),
    body('reason')
        .trim()
        .notEmpty().withMessage('Reason is required')
        .isLength({ min: 10, max: 500 }).withMessage('Reason must be 10-500 characters'),
    body('isUrgent')
        .optional()
        .isBoolean().withMessage('isUrgent must be a boolean'),
];

// Validates leave status update (approve/reject) by managers
const leaveStatusUpdateRules = [
    body('status')
        .notEmpty().withMessage('Status is required')
        .isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
    body('managerComment')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Comment must not exceed 500 characters'),
];

// ━━━ User Validation Rules ━━━

// Validates user profile update input
const updateProfileRules = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
];

// Validates role assignment by admin
const assignRoleRules = [
    body('role')
        .notEmpty().withMessage('Role is required')
        .isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
];

// ━━━ Department Validation Rules ━━━

// Validates department creation/update input
const departmentRules = [
    body('name')
        .trim()
        .notEmpty().withMessage('Department name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('code')
        .trim()
        .notEmpty().withMessage('Department code is required')
        .isLength({ min: 2, max: 10 }).withMessage('Code must be 2-10 characters')
        .isAlphanumeric().withMessage('Code must be alphanumeric'),
    body('manager')
        .optional()
        .isMongoId().withMessage('Invalid manager ID'),
];

// ━━━ Holiday Validation Rules ━━━

// Validates holiday creation input
const holidayRules = [
    body('name')
        .trim()
        .notEmpty().withMessage('Holiday name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('date')
        .notEmpty().withMessage('Date is required')
        .isISO8601().withMessage('Invalid date format'),
    body('type')
        .optional()
        .isIn(['national', 'company', 'regional']).withMessage('Invalid holiday type'),
    body('isRecurring')
        .optional()
        .isBoolean().withMessage('isRecurring must be a boolean'),
];

// ━━━ Query Validation Rules ━━━

// Validates pagination query parameters
const paginationRules = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortBy')
        .optional()
        .isString().withMessage('sortBy must be a string'),
    query('order')
        .optional()
        .isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
];

// Validates MongoDB ObjectId in route parameters
const mongoIdRule = [
    param('id')
        .isMongoId().withMessage('Invalid ID format'),
];

module.exports = {
    registerRules,
    loginRules,
    leaveApplicationRules,
    leaveStatusUpdateRules,
    updateProfileRules,
    assignRoleRules,
    departmentRules,
    holidayRules,
    paginationRules,
    mongoIdRule,
};

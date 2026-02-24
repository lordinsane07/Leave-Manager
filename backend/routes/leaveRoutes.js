const express = require('express');
const router = express.Router();
const {
    applyLeave,
    getLeaves,
    getLeaveById,
    updateLeaveStatus,
    cancelLeave,
} = require('../controllers/leaveController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { leaveApplicationRules, leaveStatusUpdateRules, paginationRules, mongoIdRule } = require('../utils/validators');

// All leave routes require authentication
router.use(protect);

// Employee applies for leave
router.post('/', leaveApplicationRules, applyLeave);

// List leaves with pagination/filtering (role-scoped in controller)
router.get('/', paginationRules, getLeaves);

// Get single leave detail
router.get('/:id', mongoIdRule, getLeaveById);

// Manager/admin approve or reject leave
router.patch('/:id/status', restrictTo('manager', 'admin'), mongoIdRule, leaveStatusUpdateRules, updateLeaveStatus);

// Employee cancels own leave
router.patch('/:id/cancel', mongoIdRule, cancelLeave);

module.exports = router;

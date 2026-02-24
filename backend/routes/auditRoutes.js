const express = require('express');
const router = express.Router();
const {
    getAuditLogs,
    getAuditLogById,
    exportAuditLogs,
} = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { paginationRules, mongoIdRule } = require('../utils/validators');
const ApiError = require('../utils/ApiError');

// All audit routes require admin authentication
router.use(protect, restrictTo('admin'));

// List and filter audit logs
router.get('/', paginationRules, getAuditLogs);

// Export audit logs
router.get('/export', exportAuditLogs);

// Get single audit entry
router.get('/:id', mongoIdRule, getAuditLogById);

// Immutable — audit records cannot be edited or deleted (403)
router.put('/:id', (req, res, next) => {
    next(ApiError.forbidden('Audit logs are immutable and cannot be modified'));
});
router.delete('/:id', (req, res, next) => {
    next(ApiError.forbidden('Audit logs are immutable and cannot be deleted'));
});

module.exports = router;

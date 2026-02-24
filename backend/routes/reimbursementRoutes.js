const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    submitClaim,
    getAllClaims,
    getClaimById,
    updateStatus,
    cancelClaim,
    getStats,
} = require('../controllers/reimbursementController');

// All routes require authentication
router.use(protect);

// Stats (must be before /:id to avoid conflicts)
router.get('/stats', getStats);

// CRUD
router.post('/', submitClaim);
router.get('/', getAllClaims);
router.get('/:id', getClaimById);

// Actions
router.patch('/:id/status', updateStatus);
router.patch('/:id/cancel', cancelClaim);

module.exports = router;

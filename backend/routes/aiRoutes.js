const express = require('express');
const router = express.Router();
const {
    getLeaveAdviceHandler,
    getBurnoutScore,
    getTeamBurnoutHandler,
    parseLeaveInput,
    getRejectionReasonHandler,
    getSmartSuggestionsHandler,
    getPredictionsHandler,
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// All AI routes require authentication
router.use(protect);

// Leave advice and NLP parsing — available to all authenticated users
router.post('/leave-advice', getLeaveAdviceHandler);
router.post('/parse-leave', parseLeaveInput);

// Burnout score — employees see own, managers/admins see any
router.get('/burnout/:employeeId', getBurnoutScore);
router.get('/burnout/team/:managerId', restrictTo('manager', 'admin'), getTeamBurnoutHandler);

// Rejection reason assistant — managers and admins only
router.post('/rejection-reason', restrictTo('manager', 'admin'), getRejectionReasonHandler);

// Smart suggestions — available to all authenticated users
router.get('/suggestions/:employeeId', getSmartSuggestionsHandler);

// Trend-based forecast — managers and admins only
router.get('/predictions', restrictTo('manager', 'admin'), getPredictionsHandler);

module.exports = router;

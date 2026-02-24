const express = require('express');
const router = express.Router();
const {
    getOverview,
    getLeaveDistribution,
    getMonthlyTrend,
    getDepartmentComparison,
    getTeamAnalytics,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

// All analytics routes require authentication
router.use(protect);

// Admin-only overview and department comparison
router.get('/overview', restrictTo('admin'), getOverview);
router.get('/department-comparison', restrictTo('admin'), getDepartmentComparison);

// Admin and manager can access distribution and trends
router.get('/leave-distribution', restrictTo('admin', 'manager'), getLeaveDistribution);
router.get('/monthly-trend', restrictTo('admin', 'manager'), getMonthlyTrend);

// Manager-only team analytics
router.get('/team', restrictTo('manager'), getTeamAnalytics);

module.exports = router;

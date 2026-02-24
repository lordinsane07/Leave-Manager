const express = require('express');
const router = express.Router();
const {
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
} = require('../controllers/holidayController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { holidayRules, mongoIdRule } = require('../utils/validators');

// All holiday routes require authentication
router.use(protect);

// Anyone can view holidays
router.get('/', getHolidays);

// Admin-only mutation routes
router.post('/', restrictTo('admin'), holidayRules, createHoliday);
router.put('/:id', restrictTo('admin'), mongoIdRule, updateHoliday);
router.delete('/:id', restrictTo('admin'), mongoIdRule, deleteHoliday);

module.exports = router;

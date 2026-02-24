const express = require('express');
const router = express.Router();
const {
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
} = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { departmentRules, mongoIdRule } = require('../utils/validators');

// All department routes require authentication
router.use(protect);

// Anyone authenticated can view departments
router.get('/', getDepartments);
router.get('/:id', mongoIdRule, getDepartmentById);

// Admin-only mutation routes
router.post('/', restrictTo('admin'), departmentRules, createDepartment);
router.put('/:id', restrictTo('admin'), mongoIdRule, departmentRules, updateDepartment);
router.delete('/:id', restrictTo('admin'), mongoIdRule, deleteDepartment);

module.exports = router;

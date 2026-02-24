const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUserById,
    updateProfile,
    assignRole,
    deactivateUser,
    assignManager,
    assignDepartment,
    uploadAvatarHandler,
} = require('../controllers/userController');
const { uploadAvatar } = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { updateProfileRules, assignRoleRules, paginationRules, mongoIdRule } = require('../utils/validators');

// All user routes require authentication
router.use(protect);

// List users — admin sees all, manager sees own department
router.get('/', restrictTo('admin', 'manager'), paginationRules, getUsers);

// Update own profile
router.put('/profile', updateProfileRules, updateProfile);

// Upload avatar
router.post('/avatar', uploadAvatar.single('avatar'), uploadAvatarHandler);

// Get single user by ID
router.get('/:id', mongoIdRule, getUserById);

// Admin-only operations
router.patch('/:id/role', restrictTo('admin'), mongoIdRule, assignRoleRules, assignRole);
router.patch('/:id/deactivate', restrictTo('admin'), mongoIdRule, deactivateUser);
router.put('/:id/manager', restrictTo('admin'), mongoIdRule, assignManager);
router.patch('/:id/department', restrictTo('admin'), mongoIdRule, assignDepartment);

module.exports = router;

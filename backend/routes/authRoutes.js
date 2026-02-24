const express = require('express');
const router = express.Router();
const { register, verifyOTP, resendOTP, googleAuth, login, refreshAccessToken, logout, getMe, forgotPassword, resetPassword, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerRules, loginRules } = require('../utils/validators');

// Public routes with rate limiting on auth endpoints
router.post('/register', authLimiter, registerRules, register);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/resend-otp', authLimiter, resendOTP);
router.post('/google', authLimiter, googleAuth);
router.post('/login', authLimiter, loginRules, login);
router.post('/refresh', refreshAccessToken);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);

// Password reset (public, rate-limited)
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;

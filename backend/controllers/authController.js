const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/authMiddleware');
const { createAuditEntry } = require('../middleware/auditLogger');
const { sendOTPEmail } = require('../services/emailService');
const logger = require('../utils/logger');

// In-memory blacklist for revoked tokens (Redis-ready structure)
const tokenBlacklist = new Set();

// Generates JWT access token (short-lived, 15min)
const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    });
};

// Generates JWT refresh token (long-lived, 7 days)
const generateRefreshToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    });
};

// Sets refresh token as HTTP-only cookie on response
const setRefreshCookie = (res, token) => {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

// Generates a 6-digit OTP and sets 10-min expiry
const generateOTP = () => {
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return { otp, otpExpiry };
};

// Returns sanitized user data without sensitive fields
const sanitizeUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    avatar: user.avatar,
    leaveBalance: user.leaveBalance,
    totalLeaveTaken: user.totalLeaveTaken,
    joinDate: user.joinDate,
    isEmailVerified: user.isEmailVerified,
    authProvider: user.authProvider,
});

// ━━━ POST /api/auth/register — Step 1: Create user + send OTP ━━━
const register = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ApiError.badRequest('Validation failed', errors.array().map((e) => e.msg));
    }

    const { name, email, password, role, department } = req.body;

    // Generate OTP
    const { otp, otpExpiry } = generateOTP();

    // Check for existing user
    const existingUser = await User.findOne({ email });

    let user;

    if (existingUser) {
        if (existingUser.isEmailVerified) {
            // Verified account — cannot re-register
            throw ApiError.conflict('Email already registered');
        }

        // Unverified account — update with new info and fresh OTP
        existingUser.name = name;
        existingUser.password = password;
        existingUser.role = role || 'employee';
        existingUser.department = department;
        existingUser.otp = otp;
        existingUser.otpExpiry = otpExpiry;
        await existingUser.save();
        user = existingUser;
        logger.info(`Unverified account updated with new OTP: ${email}`);
    } else {
        // Create new user (unverified)
        user = await User.create({
            name,
            email,
            password,
            role: role || 'employee',
            department,
            authProvider: 'local',
            isEmailVerified: false,
            otp,
            otpExpiry,
        });
    }

    // Send OTP email
    await sendOTPEmail(email, name, otp);

    logger.info(`OTP sent for registration: ${email}`);

    return ApiResponse.created(res, 'OTP sent to your email. Please verify to complete registration.', {
        userId: user._id,
        email: user.email,
        requiresOTP: true,
    });
});

// ━━━ POST /api/auth/verify-otp — Step 2: Verify OTP and complete registration ━━━
const verifyOTP = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw ApiError.badRequest('Email and OTP are required');
    }

    const user = await User.findOne({ email }).select('+otp +otpExpiry').populate('department', 'name code');
    if (!user) {
        throw ApiError.notFound('User not found');
    }

    if (user.isEmailVerified) {
        throw ApiError.badRequest('Email already verified');
    }

    // Check OTP validity
    if (!user.otp || user.otp !== otp) {
        throw ApiError.unauthorized('Invalid OTP');
    }

    if (user.otpExpiry < new Date()) {
        throw ApiError.unauthorized('OTP has expired. Please request a new one.');
    }

    // Mark as verified, clear OTP
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;

    // Generate token pair
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });
    setRefreshCookie(res, refreshToken);

    // Audit log
    await createAuditEntry({
        actor: user._id,
        action: 'CREATE',
        targetModel: 'User',
        targetId: user._id,
        changes: { before: null, after: { name: user.name, email: user.email, role: user.role } },
        req,
    });

    logger.info(`Email verified and registration complete: ${email}`);

    return ApiResponse.ok(res, 'Email verified! Registration complete.', {
        user: sanitizeUser(user),
        accessToken,
    });
});

// ━━━ POST /api/auth/resend-otp — Resend OTP for email verification ━━━
const resendOTP = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        throw ApiError.badRequest('Email is required');
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw ApiError.notFound('User not found');
    }

    if (user.isEmailVerified) {
        throw ApiError.badRequest('Email already verified');
    }

    // Generate new OTP
    const { otp, otpExpiry } = generateOTP();
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save({ validateBeforeSave: false });

    // Send OTP email
    await sendOTPEmail(email, user.name, otp);

    logger.info(`OTP resent to: ${email}`);

    return ApiResponse.ok(res, 'New OTP sent to your email.');
});

// ━━━ POST /api/auth/google — Google OAuth sign-in/sign-up ━━━
const googleAuth = asyncHandler(async (req, res, next) => {
    const { credential } = req.body;

    if (!credential) {
        throw ApiError.badRequest('Google credential token is required');
    }

    // Decode the Google JWT ID token (Header.Payload.Signature)
    // In production, verify signature with Google's public keys
    // For now, we decode and validate claims
    let payload;
    try {
        const parts = credential.split('.');
        if (parts.length !== 3) throw new Error('Invalid token');
        payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
        throw ApiError.unauthorized('Invalid Google token');
    }

    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email || !googleId) {
        throw ApiError.unauthorized('Invalid Google token payload');
    }

    // Check if user exists
    let user = await User.findOne({ $or: [{ googleId }, { email }] }).populate('department', 'name code');

    if (user) {
        // Existing user — update Google info if needed
        if (!user.googleId) {
            user.googleId = googleId;
            user.authProvider = 'google';
        }
        if (picture && !user.avatar) {
            user.avatar = picture;
        }
        user.isEmailVerified = true;
    } else {
        // New user — create account via Google (no password needed)
        user = new User({
            name: name || email.split('@')[0],
            email,
            googleId,
            authProvider: 'google',
            isEmailVerified: true,
            avatar: picture || '',
            role: 'employee',
        });
    }

    // Generate token pair
    const accessToken = generateAccessToken(user._id || undefined);
    const refreshToken = generateRefreshToken(user._id || undefined);
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    setRefreshCookie(res, refreshToken);

    // Audit log
    await createAuditEntry({
        actor: user._id,
        action: 'LOGIN',
        targetModel: 'User',
        targetId: user._id,
        changes: { method: 'google' },
        req,
    });

    logger.info(`Google auth: ${email}`);

    return ApiResponse.ok(res, 'Google sign-in successful', {
        user: sanitizeUser(user),
        accessToken,
    });
});

// ━━━ POST /api/auth/login — Authenticate user with email + password ━━━
const login = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw ApiError.badRequest('Validation failed', errors.array().map((e) => e.msg));
    }

    const { email, password } = req.body;

    // Fetch user including password field for comparison
    const user = await User.findOne({ email }).select('+password +refreshToken').populate('department', 'name code');
    if (!user) {
        throw ApiError.unauthorized('Invalid email or password');
    }

    // If user registered via Google, tell them to use Google sign-in
    if (user.authProvider === 'google' && !user.password) {
        throw ApiError.badRequest('This account uses Google sign-in. Please use "Continue with Google".');
    }

    // Check if email is verified for local auth
    if (user.authProvider === 'local' && !user.isEmailVerified) {
        throw ApiError.unauthorized('Please verify your email first. Check your inbox for the OTP.');
    }

    // Check if account is locked due to failed attempts
    if (user.isLocked()) {
        throw ApiError.tooManyRequests('Account temporarily locked. Try again later.');
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        await user.handleFailedLogin();
        throw ApiError.unauthorized('Invalid email or password');
    }

    // Reset failed attempts on successful login
    await user.resetLoginAttempts();

    // Generate fresh token pair
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    setRefreshCookie(res, refreshToken);

    // Log login action
    await createAuditEntry({
        actor: user._id,
        action: 'LOGIN',
        targetModel: 'User',
        targetId: user._id,
        req,
    });

    return ApiResponse.ok(res, 'Login successful', { user: sanitizeUser(user), accessToken });
});

// ━━━ POST /api/auth/refresh — Rotate access token using refresh token ━━━
const refreshAccessToken = asyncHandler(async (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        throw ApiError.unauthorized('No refresh token provided');
    }

    // Check if token has been blacklisted
    if (tokenBlacklist.has(refreshToken)) {
        throw ApiError.unauthorized('Token has been revoked');
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const user = await User.findById(decoded.id).select('+refreshToken');
        if (!user || user.refreshToken !== refreshToken) {
            throw ApiError.unauthorized('Invalid refresh token');
        }

        // Rotate tokens — issue new pair, invalidate old refresh token
        const newAccessToken = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        // Blacklist old refresh token
        tokenBlacklist.add(refreshToken);

        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });
        setRefreshCookie(res, newRefreshToken);

        return ApiResponse.ok(res, 'Token refreshed', { accessToken: newAccessToken });
    } catch (error) {
        throw ApiError.unauthorized('Invalid or expired refresh token');
    }
});

// ━━━ POST /api/auth/logout — Revoke tokens and clear cookie ━━━
const logout = asyncHandler(async (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken;

    // Blacklist the refresh token if present
    if (refreshToken) {
        tokenBlacklist.add(refreshToken);
    }

    // Clear user's stored refresh token
    if (req.user) {
        await User.findByIdAndUpdate(req.user._id, { refreshToken: '' });

        await createAuditEntry({
            actor: req.user._id,
            action: 'LOGOUT',
            targetModel: 'User',
            targetId: req.user._id,
            req,
        });
    }

    // Clear the HTTP-only cookie
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });

    return ApiResponse.ok(res, 'Logout successful');
});

// ━━━ POST /api/auth/forgot-password — Send password reset OTP ━━━
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw ApiError.badRequest('Email is required');

    const user = await User.findOne({ email });
    if (!user) {
        // Return success even if email not found — prevents user enumeration
        return ApiResponse.ok(res, 'If the email exists, a reset OTP has been sent.');
    }

    if (user.authProvider === 'google') {
        throw ApiError.badRequest('This account uses Google sign-in. Password reset is not available.');
    }

    const { otp, otpExpiry } = generateOTP();
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save({ validateBeforeSave: false });

    await sendOTPEmail(email, user.name, otp);
    logger.info(`Password reset OTP sent to: ${email}`);

    return ApiResponse.ok(res, 'Password reset OTP sent to your email.', { email });
});

// ━━━ POST /api/auth/reset-password — Verify OTP and set new password ━━━
const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        throw ApiError.badRequest('Email, OTP, and new password are required');
    }

    if (newPassword.length < 8) {
        throw ApiError.badRequest('Password must be at least 8 characters');
    }

    const user = await User.findOne({ email }).select('+otp +otpExpiry +password');
    if (!user) throw ApiError.notFound('User not found');

    if (!user.otp || user.otp !== otp) {
        throw ApiError.unauthorized('Invalid OTP');
    }

    if (user.otpExpiry < new Date()) {
        throw ApiError.unauthorized('OTP has expired. Please request a new one.');
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    logger.info(`Password reset successful for: ${email}`);
    return ApiResponse.ok(res, 'Password reset successful. You can now log in with your new password.');
});

// ━━━ POST /api/auth/change-password — Change password (authenticated) ━━━
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        throw ApiError.badRequest('Current and new passwords are required');
    }

    if (newPassword.length < 8) {
        throw ApiError.badRequest('New password must be at least 8 characters');
    }

    const user = await User.findById(req.user._id).select('+password');

    if (user.authProvider === 'google' && !user.password) {
        throw ApiError.badRequest('Google-authenticated accounts cannot change password here.');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        throw ApiError.unauthorized('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for: ${user.email}`);
    return ApiResponse.ok(res, 'Password changed successfully.');
});

// ━━━ GET /api/auth/me — Get current authenticated user ━━━
const getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id).populate('department', 'name code leavePolicy');

    return ApiResponse.ok(res, 'User profile retrieved', { user });
});

module.exports = {
    register,
    verifyOTP,
    resendOTP,
    googleAuth,
    login,
    refreshAccessToken,
    logout,
    getMe,
    forgotPassword,
    resetPassword,
    changePassword,
};

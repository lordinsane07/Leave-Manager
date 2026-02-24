const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// Higher-order function wrapping async route handlers for automatic error catching
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Verifies JWT access token and attaches user to request object
const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Extract Bearer token from Authorization header
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        throw ApiError.unauthorized('Not authenticated — no token provided');
    }

    try {
        // Verify token signature and expiry
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Attach user (without password) to request
        const user = await User.findById(decoded.id).select('-password').populate('department', 'name');

        if (!user) {
            throw ApiError.unauthorized('User belonging to this token no longer exists');
        }

        if (!user.isActive) {
            throw ApiError.forbidden('Account has been deactivated');
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            throw ApiError.unauthorized('Invalid token');
        }
        if (error.name === 'TokenExpiredError') {
            throw ApiError.unauthorized('Token expired');
        }
        throw error;
    }
});

module.exports = { protect, asyncHandler };

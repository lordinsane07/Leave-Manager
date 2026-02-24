const rateLimit = require('express-rate-limit');

// General API rate limiter — prevents abuse across all endpoints
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    message: {
        success: false,
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict limiter for auth routes — 5 attempts per 15 minutes to prevent brute-force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5,
    message: {
        success: false,
        statusCode: 429,
        message: 'Too many login attempts. Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests so only failures count
    skipSuccessfulRequests: true,
});

module.exports = { apiLimiter, authLimiter };

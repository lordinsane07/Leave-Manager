const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// Global error handling middleware — catches all errors passed via next()
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;

    // Log the full error for debugging
    logger.error(`${err.message}`, { stack: err.stack, url: req.originalUrl });

    // Handle Mongoose bad ObjectId cast error
    if (err.name === 'CastError') {
        error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
    }

    // Handle Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)?.[0] ?? 'field';
        error = ApiError.conflict(`Duplicate value for '${field}'. Please use another value.`);
    }

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((val) => val.message);
        error = ApiError.badRequest('Validation failed', messages);
    }

    // Handle JWT errors (fallback — primarily caught in authMiddleware)
    if (err.name === 'JsonWebTokenError') {
        error = ApiError.unauthorized('Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        error = ApiError.unauthorized('Token expired');
    }

    // Send structured error response
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        statusCode,
        message: error.message || 'Internal server error',
        errors: error.errors || [],
        // Include stack trace only in development mode
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
};

module.exports = errorHandler;

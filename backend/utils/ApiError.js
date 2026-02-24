// Custom API error class with HTTP status code and operational flag
class ApiError extends Error {
    constructor(statusCode, message, errors = [], stack = '') {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.errors = errors;
        this.success = false;
        // Marks error as operational (expected) vs programming (unexpected)
        this.isOperational = true;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    // Factory for 400 Bad Request
    static badRequest(message, errors = []) {
        return new ApiError(400, message, errors);
    }

    // Factory for 401 Unauthorized
    static unauthorized(message = 'Authentication required') {
        return new ApiError(401, message);
    }

    // Factory for 403 Forbidden
    static forbidden(message = 'Access denied') {
        return new ApiError(403, message);
    }

    // Factory for 404 Not Found
    static notFound(message = 'Resource not found') {
        return new ApiError(404, message);
    }

    // Factory for 409 Conflict
    static conflict(message) {
        return new ApiError(409, message);
    }

    // Factory for 429 Too Many Requests
    static tooManyRequests(message = 'Too many requests, please try again later') {
        return new ApiError(429, message);
    }

    // Factory for 500 Internal Server Error
    static internal(message = 'Internal server error') {
        return new ApiError(500, message);
    }
}

module.exports = ApiError;

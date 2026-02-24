// Standardized API response wrapper for consistent JSON structure
class ApiResponse {
    constructor(statusCode, message, data = null, pagination = null) {
        this.success = statusCode >= 200 && statusCode < 300;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;

        // Attach pagination metadata when present
        if (pagination) {
            this.pagination = pagination;
        }
    }

    // Sends the response using the Express response object
    send(res) {
        return res.status(this.statusCode).json({
            success: this.success,
            statusCode: this.statusCode,
            message: this.message,
            data: this.data,
            ...(this.pagination && { pagination: this.pagination }),
        });
    }

    // Factory for 200 OK
    static ok(res, message, data, pagination) {
        return new ApiResponse(200, message, data, pagination).send(res);
    }

    // Factory for 201 Created
    static created(res, message, data) {
        return new ApiResponse(201, message, data).send(res);
    }

    // Factory for 204 No Content
    static noContent(res) {
        return res.status(204).send();
    }
}

module.exports = ApiResponse;

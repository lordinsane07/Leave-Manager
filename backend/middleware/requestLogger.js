const logger = require('../utils/logger');

// Logs every incoming HTTP request with method, URL, and response time
const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Fires when the response finishes
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

        // Use appropriate log level based on HTTP status
        if (res.statusCode >= 500) {
            logger.error(logMessage);
        } else if (res.statusCode >= 400) {
            logger.warn(logMessage);
        } else {
            logger.info(logMessage);
        }
    });

    next();
};

module.exports = requestLogger;

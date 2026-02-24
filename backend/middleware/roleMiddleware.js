const ApiError = require('../utils/ApiError');

// Returns middleware that restricts route access to specified roles
const restrictTo = (...roles) => {
    return (req, res, next) => {
        // Ensure user is authenticated first
        if (!req.user) {
            return next(ApiError.unauthorized('Authentication required'));
        }

        // Check if user's role is in the allowed list
        if (!roles.includes(req.user.role)) {
            return next(
                ApiError.forbidden(
                    `Role '${req.user.role}' is not authorized to access this resource`
                )
            );
        }

        next();
    };
};

module.exports = { restrictTo };

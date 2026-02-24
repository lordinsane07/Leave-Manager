const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

// Creates an audit log entry for state-changing actions
const createAuditEntry = async ({ actor, action, targetModel, targetId, changes, req }) => {
    try {
        await AuditLog.create({
            actor,
            action,
            targetModel,
            targetId,
            changes: changes || { before: null, after: null },
            ipAddress: req?.ip || req?.connection?.remoteAddress || '',
            userAgent: req?.get('User-Agent') || '',
        });
    } catch (error) {
        // Audit logging failure should not break the main operation
        logger.error(`Audit log creation failed: ${error.message}`);
    }
};

// Middleware factory — wraps route handler to auto-log the action after execution
const auditAction = (action, targetModel) => {
    return (req, res, next) => {
        // Store audit metadata on the request for controllers to populate
        req.auditAction = action;
        req.auditTargetModel = targetModel;
        next();
    };
};

module.exports = { createAuditEntry, auditAction };

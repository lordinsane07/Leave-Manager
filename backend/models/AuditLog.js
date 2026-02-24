const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Actor is required'],
        },
        action: {
            type: String,
            required: [true, 'Action is required'],
            enum: [
                'CREATE', 'UPDATE', 'DELETE',
                'LOGIN', 'LOGOUT',
                'APPROVE', 'REJECT', 'CANCEL',
                'ROLE_CHANGE', 'PASSWORD_CHANGE',
                'EXPORT',
            ],
        },
        targetModel: {
            type: String,
            required: [true, 'Target model is required'],
            enum: ['User', 'Leave', 'Department', 'Holiday', 'Notification'],
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        // Stores before/after diff for state-changing operations
        changes: {
            before: { type: mongoose.Schema.Types.Mixed, default: null },
            after: { type: mongoose.Schema.Types.Mixed, default: null },
        },
        ipAddress: {
            type: String,
            default: '',
        },
        userAgent: {
            type: String,
            default: '',
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false, // Using custom timestamp field
    }
);

// Indexes for efficient audit log querying
auditLogSchema.index({ actor: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

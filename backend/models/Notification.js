const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Recipient is required'],
            index: true,
        },
        type: {
            type: String,
            enum: [
                'leave_submitted',
                'leave_approved',
                'leave_rejected',
                'leave_cancelled',
                'leave_expired',
                'reimbursement_manager_approved',
                'reimbursement_approved',
                'reimbursement_rejected',
                'balance_updated',
                'burnout_alert',
                'system',
            ],
            required: [true, 'Notification type is required'],
        },
        message: {
            type: String,
            required: [true, 'Message is required'],
            trim: true,
            maxlength: 500,
        },
        // Flexible data payload for type-specific details
        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for querying unread notifications per user
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Employee reference is required'],
            index: true,
        },
        leaveType: {
            type: String,
            enum: ['annual', 'sick', 'personal', 'maternity', 'paternity'],
            required: [true, 'Leave type is required'],
        },
        startDate: {
            type: Date,
            required: [true, 'Start date is required'],
            index: true,
        },
        endDate: {
            type: Date,
            required: [true, 'End date is required'],
        },
        totalDays: {
            type: Number,
            required: [true, 'Total days is required'],
            min: 1,
        },
        reason: {
            type: String,
            required: [true, 'Reason is required'],
            trim: true,
            minlength: 10,
            maxlength: 500,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'cancelled', 'expired'],
            default: 'pending',
            index: true,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        managerComment: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        attachmentUrl: {
            type: String,
            default: '',
        },
        isUrgent: {
            type: Boolean,
            default: false,
        },
        appliedAt: {
            type: Date,
            default: Date.now,
        },
        processedAt: {
            type: Date,
        },
        notificationSent: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// ━━━ Compound indexes for efficient queries ━━━
leaveSchema.index({ employee: 1, status: 1 });
leaveSchema.index({ employee: 1, startDate: 1 });
leaveSchema.index({ status: 1, createdAt: -1 });

// ━━━ Virtual: human-readable duration label ━━━
leaveSchema.virtual('durationLabel').get(function () {
    if (this.totalDays === 1) return '1 day';
    if (this.totalDays < 7) return `${this.totalDays} days`;
    const weeks = Math.floor(this.totalDays / 5);
    const remaining = this.totalDays % 5;
    if (remaining === 0) return `${weeks} week${weeks > 1 ? 's' : ''}`;
    return `${weeks}w ${remaining}d`;
});

// Include virtuals in JSON/Object output
leaveSchema.set('toJSON', { virtuals: true });
leaveSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Leave', leaveSchema);

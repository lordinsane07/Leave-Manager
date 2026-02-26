const mongoose = require('mongoose');

const reimbursementSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Employee reference is required'],
            index: true,
        },
        category: {
            type: String,
            enum: ['travel', 'medical', 'food', 'equipment', 'training', 'other'],
            required: [true, 'Expense category is required'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [1, 'Amount must be at least 1'],
        },
        currency: {
            type: String,
            default: 'INR',
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
            minlength: 5,
            maxlength: 500,
        },
        receiptUrl: {
            type: String,
            default: '',
        },
        expenseDate: {
            type: Date,
            required: [true, 'Expense date is required'],
        },
        status: {
            type: String,
            enum: ['pending', 'manager_approved', 'approved', 'rejected', 'cancelled'],
            default: 'pending',
            index: true,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        approverComment: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
        processedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
reimbursementSchema.index({ employee: 1, status: 1 });
reimbursementSchema.index({ status: 1, createdAt: -1 });

// Virtuals
reimbursementSchema.virtual('formattedAmount').get(function () {
    return `${this.currency} ${this.amount.toLocaleString()}`;
});

reimbursementSchema.set('toJSON', { virtuals: true });
reimbursementSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Reimbursement', reimbursementSchema);

const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Department name is required'],
            trim: true,
            unique: true,
            minlength: 2,
            maxlength: 100,
        },
        code: {
            type: String,
            required: [true, 'Department code is required'],
            trim: true,
            unique: true,
            uppercase: true,
            minlength: 2,
            maxlength: 10,
        },
        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        employees: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        // Configurable leave policy per department
        leavePolicy: {
            annual: { type: Number, default: 20 },
            sick: { type: Number, default: 10 },
            personal: { type: Number, default: 5 },
            maternity: { type: Number, default: 90 },
            paternity: { type: Number, default: 15 },
            maxConsecutiveDays: { type: Number, default: 15 },
            requiresApproval: { type: Boolean, default: true },
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for `name` and `code` are automatically created because of `unique: true` in their schema definitions.

module.exports = mongoose.model('Department', departmentSchema);

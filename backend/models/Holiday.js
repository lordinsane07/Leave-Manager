const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Holiday name is required'],
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        date: {
            type: Date,
            required: [true, 'Holiday date is required'],
        },
        type: {
            type: String,
            enum: ['national', 'company', 'regional'],
            default: 'national',
        },
        isRecurring: {
            type: Boolean,
            default: false,
        },
        year: {
            type: Number,
            default: () => new Date().getFullYear(),
        },
    },
    {
        timestamps: true,
    }
);

// Index on date for range queries and year for annual lookups
holidaySchema.index({ date: 1 });
holidaySchema.index({ year: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);

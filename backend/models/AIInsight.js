const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Employee reference is required'],
            index: true,
        },
        insightType: {
            type: String,
            enum: ['burnout', 'leave_suggestion', 'trend_forecast', 'team_coverage'],
            required: [true, 'Insight type is required'],
        },
        // Numeric score for quantifiable insights (e.g., burnout 0–100)
        score: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
        },
        message: {
            type: String,
            required: [true, 'Insight message is required'],
            trim: true,
        },
        // Actionable recommendations array
        recommendations: [
            {
                type: String,
                trim: true,
            },
        ],
        generatedAt: {
            type: Date,
            default: Date.now,
        },
        isAcknowledged: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for querying insights by employee and type
aiInsightSchema.index({ employee: 1, insightType: 1, generatedAt: -1 });

module.exports = mongoose.model('AIInsight', aiInsightSchema);

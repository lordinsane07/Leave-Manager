const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Default leave balance allocation for new employees
const DEFAULT_LEAVE_BALANCE = {
    annual: 20,
    sick: 10,
    personal: 5,
    maternity: 90,
    paternity: 15,
};

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: 2,
            maxlength: 50,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: function () { return this.authProvider === 'local'; },
            minlength: 8,
            select: false, // Excluded from queries by default
        },
        // Authentication provider — 'local' (email+password) or 'google'
        authProvider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local',
        },
        googleId: {
            type: String,
            sparse: true,
        },
        // Email verification
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        // OTP for email verification
        otp: {
            type: String,
            select: false,
        },
        otpExpiry: {
            type: Date,
            select: false,
        },
        role: {
            type: String,
            enum: ['admin', 'manager', 'employee'],
            default: 'employee',
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
        },
        managerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        avatar: {
            type: String,
            default: '',
        },
        // Leave balance keyed by leave type
        leaveBalance: {
            annual: { type: Number, default: DEFAULT_LEAVE_BALANCE.annual },
            sick: { type: Number, default: DEFAULT_LEAVE_BALANCE.sick },
            personal: { type: Number, default: DEFAULT_LEAVE_BALANCE.personal },
            maternity: { type: Number, default: DEFAULT_LEAVE_BALANCE.maternity },
            paternity: { type: Number, default: DEFAULT_LEAVE_BALANCE.paternity },
        },
        totalLeaveTaken: {
            type: Number,
            default: 0,
        },
        joinDate: {
            type: Date,
            default: Date.now,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        // Account lockout fields for brute-force protection
        failedLoginAttempts: {
            type: Number,
            default: 0,
        },
        lockUntil: {
            type: Date,
            default: null,
        },
        refreshToken: {
            type: String,
            select: false, // Never exposed in normal queries
        },
    },
    {
        timestamps: true,
    }
);

// ━━━ Indexes ━━━
// `email` index automatically created because of `unique: true` in schema
userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ managerId: 1 });

// ━━━ Virtual: combined leave balance summary ━━━
userSchema.virtual('fullLeaveBalance').get(function () {
    const bal = this.leaveBalance || {};
    const total = Object.values(bal).reduce((sum, v) => sum + (v || 0), 0);
    return { ...bal, total, taken: this.totalLeaveTaken };
});

// Ensure virtuals are included in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// ━━━ Pre-save hook: hash password on creation or change ━━━
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compares a candidate password against the stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Checks if the account is currently locked
userSchema.methods.isLocked = function () {
    return this.lockUntil && this.lockUntil > Date.now();
};

// Increments failed login attempts and locks account after 5 failures
userSchema.methods.handleFailedLogin = async function () {
    const updates = { $inc: { failedLoginAttempts: 1 } };
    // Lock account for 30 minutes after 5 failed attempts
    if (this.failedLoginAttempts + 1 >= 5) {
        updates.$set = { lockUntil: new Date(Date.now() + 30 * 60 * 1000) };
    }
    await this.updateOne(updates);
};

// Resets failed login counter after successful login
userSchema.methods.resetLoginAttempts = async function () {
    await this.updateOne({
        $set: { failedLoginAttempts: 0, lockUntil: null },
    });
};

module.exports = mongoose.model('User', userSchema);

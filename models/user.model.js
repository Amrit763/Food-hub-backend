const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const config = require('../config');

const userSchema = new Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: function() {
            return !this.googleId;
        },
        minlength: 8 // Increased minimum length
    },
    role: {
        type: String,
        enum: ['user', 'chef', 'admin'],
        default: 'user'
    },
    profileImage: {
        type: String,
        default: null
    },
    // Password Reset Fields
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    
    // Password History (for preventing reuse)
    passwordHistory: [{
        password: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Email verification fields
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        default: null
    },
    emailVerificationExpires: {
        type: Date,
        default: null
    },
    
    // Google OAuth fields
    googleId: {
        type: String,
        default: null
    },
    
    // Two-factor authentication fields
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        default: null
    },
    twoFactorTempSecret: {
        type: String,
        default: null
    },
    twoFactorBackupCodes: {
        type: [{
            code: String,
            used: Boolean
        }],
        default: []
    }
}, {
    timestamps: true
});

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
    // Only hash the password if it's modified (or new)
    if (!this.isModified('password')) return next();
    
    try {
        // Check password complexity
        this.validatePasswordComplexity(this.password);

        // Check password history to prevent reuse
        if (this.passwordHistory && this.passwordHistory.length > 0) {
            const isPasswordReused = await this.checkPasswordHistory(this.password);
            if (isPasswordReused) {
                throw new Error('Cannot reuse previous passwords');
            }
        }

        // Generate salt and hash password
        const salt = await bcrypt.genSalt(config.saltRounds);
        const hashedPassword = await bcrypt.hash(this.password, salt);
        
        // Store current password in history before updating
        if (this.isNew || this.passwordHistory.length === 0) {
            this.passwordHistory = this.passwordHistory || [];
            this.passwordHistory.unshift({ password: hashedPassword });
        } else {
            // Limit password history to last 5 passwords
            this.passwordHistory.unshift({ password: hashedPassword });
            this.passwordHistory = this.passwordHistory.slice(0, 5);
        }

        this.password = hashedPassword;
        next();
    } catch (err) {
        next(err);
    }
});

// Method to validate password complexity
userSchema.methods.validatePasswordComplexity = function(password) {
    // Validate password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    if (!passwordRegex.test(password)) {
        throw new Error('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character');
    }
};

// Method to check password history
userSchema.methods.checkPasswordHistory = async function(newPassword) {
    for (let historicPassword of this.passwordHistory) {
        const isMatch = await bcrypt.compare(newPassword, historicPassword.password);
        if (isMatch) return true;
    }
    return false;
};

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token before storing
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    // Set token expiration (1 hour from now)
    this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    
    return resetToken; // Return unhashed token for email
};

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
    // Generate a secure random token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token before storing
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
    
    // Set token expiration (24 hours from now)
    this.emailVerificationExpires = Date.now() + 86400000; // 24 hours
    
    return verificationToken; // Return unhashed token for email
};

const User = mongoose.model('User', userSchema);

module.exports = User;
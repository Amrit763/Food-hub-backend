const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
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
        // Not required for social logins
        required: function() {
            return !this.googleId; // Only required if not using Google auth
        },
        minlength: 6
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
    phoneNumber: {
        type: String,
        default: null
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    // Two-Factor Authentication Fields
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
    twoFactorBackupCodes: [{
        code: String,
        used: {
            type: Boolean,
            default: false
        }
    }],
    // Google Authentication Fields
    googleId: {
        type: String,
        default: null
    },
    googleProfile: {
        type: Object,
        default: null
    }
}, {
    timestamps: true
});

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
    // Only hash the password if it's modified (or new) and exists
    // Skip for social logins that don't have a password
    if (!this.isModified('password') || !this.password) return next();
    
    try {
        // Generate a salt
        const salt = await bcrypt.genSalt(config.saltRounds);
        // Hash the password along with the new salt
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
    // If user doesn't have a password (social login), return false
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
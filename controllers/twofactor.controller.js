// controllers/twofactor.controller.js
const User = require('../models/user.model');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('../config');

// Function to generate JWT token (reusing from auth controller)
const generateToken = (userId) => {
    console.log('Generating token with secret key:', config.jwtSecretKey.substring(0, 5) + '...');
    return jwt.sign(
        { id: userId },
        config.jwtSecretKey,  // Use the same key as in auth.js
        { expiresIn: config.jwtExpiresIn }
    );
};

// Generate backup codes for 2FA recovery
const generateBackupCodes = (count = 10) => {
    const codes = [];
    for (let i = 0; i < count; i++) {
        // Generate a random 8-character backup code (alphanumeric)
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push({ code, used: false });
    }
    return codes;
};

/**
 * Initialize 2FA setup by generating a secret and QR code
 * @route   GET /api/auth/2fa/setup
 * @access  Private
 */
exports.setup2FA = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (user.twoFactorEnabled) {
            return res.status(400).json({
                success: false,
                message: '2FA is already enabled for this account'
            });
        }
        
        // Generate a new secret
        const secret = speakeasy.generateSecret({
            length: 20,
            name: `HomemadeApp:${user.email}` // Customize with your app name
        });
        
        // Save the temp secret to the user
        user.twoFactorTempSecret = secret.base32;
        await user.save();
        
        // Generate QR code image data as data URL
        const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);
        
        res.json({
            success: true,
            tempSecret: secret.base32,
            qrCodeDataUrl,
            otpAuthUrl: secret.otpauth_url
        });
    } catch (err) {
        console.error('2FA setup error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during 2FA setup'
        });
    }
};

/**
 * Verify and enable 2FA with provided token
 * @route   POST /api/auth/2fa/verify
 * @access  Private
 */
exports.verify2FA = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    const { token } = req.body;

    try {
        const user = await User.findById(req.user._id);
        
        if (!user.twoFactorTempSecret) {
            return res.status(400).json({
                success: false,
                message: 'You need to set up 2FA first'
            });
        }
        
        // Verify the token against the temp secret
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorTempSecret,
            encoding: 'base32',
            token,
            window: 1 // Allow 1 period before and after for clock drift
        });
        
        if (!verified) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code'
            });
        }
        
        // Generate backup codes
        const backupCodes = generateBackupCodes();
        
        // Enable 2FA
        user.twoFactorEnabled = true;
        user.twoFactorSecret = user.twoFactorTempSecret;
        user.twoFactorTempSecret = null;
        user.twoFactorBackupCodes = backupCodes;
        await user.save();
        
        // Return backup codes to user
        const plainBackupCodes = backupCodes.map(code => code.code);
        
        res.json({
            success: true,
            message: '2FA has been enabled successfully',
            backupCodes: plainBackupCodes
        });
    } catch (err) {
        console.error('2FA verification error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during 2FA verification'
        });
    }
};

/**
 * Validate 2FA token during login
 * @route   POST /api/auth/2fa/validate
 * @access  Public
 */
exports.validate2FA = async (req, res) => {
    const { email, token, backupCode } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        if (!user.twoFactorEnabled) {
            return res.status(400).json({
                success: false,
                message: '2FA is not enabled for this account'
            });
        }
        
        let isValid = false;

        // Check if using a token or backup code
        if (token) {
            console.log('Validating token:', token);
            console.log('User secret:', user.twoFactorSecret);
            
            // Try with different window sizes and make sure token is a string
            try {
                // More permissive verification (larger window)
                isValid = speakeasy.totp.verify({
                    secret: user.twoFactorSecret,
                    encoding: 'base32',
                    token: String(token).replace(/\s/g, ''),
                    window: 4  // Allow for more time drift (±2 minutes)
                });
                
                console.log('Token validation result:', isValid);
            } catch (verifyError) {
                console.error('Token verification error:', verifyError);
            }
        } else if (backupCode) {
            console.log('Checking backup code:', backupCode);
            console.log('User backup codes:', JSON.stringify(user.twoFactorBackupCodes));
            
            // More defensive backup code check
            if (Array.isArray(user.twoFactorBackupCodes)) {
                const normalizedBackupCode = String(backupCode).toUpperCase().replace(/\s/g, '');
                
                const backupCodeIndex = user.twoFactorBackupCodes.findIndex(
                    code => code && 
                    code.code === normalizedBackupCode && 
                    code.used === false
                );
                
                console.log('Backup code index found:', backupCodeIndex);
                
                if (backupCodeIndex >= 0) {
                    isValid = true;
                    // Mark backup code as used
                    user.twoFactorBackupCodes[backupCodeIndex].used = true;
                    await user.save();
                }
            }
        }
        
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid 2FA token or backup code'
            });
        }
        
        // If we got here, validation succeeded
        // Generate JWT token using the consistent generateToken function
        const jwtToken = generateToken(user._id);
        
        // Return user data (excluding password)
        const userData = await User.findById(user._id).select('-password');
        
        res.json({
            success: true,
            token: jwtToken,
            user: userData
        });
    } catch (err) {
        console.error('2FA validation detailed error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error during 2FA validation',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Disable 2FA for a user
 * @route   DELETE /api/auth/2fa/disable
 * @access  Private
 */
exports.disable2FA = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    const { password } = req.body;
    
    try {
        const user = await User.findById(req.user._id);
        
        if (!user.twoFactorEnabled) {
            return res.status(400).json({
                success: false,
                message: '2FA is not enabled for this account'
            });
        }
        
        // Verify password for security
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password'
            });
        }
        
        // Disable 2FA
        user.twoFactorEnabled = false;
        user.twoFactorSecret = null;
        user.twoFactorBackupCodes = [];
        await user.save();
        
        res.json({
            success: true,
            message: '2FA has been disabled successfully'
        });
    } catch (err) {
        console.error('2FA disable error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while disabling 2FA'
        });
    }
};

/**
 * Get new backup codes (when user has lost them)
 * @route   POST /api/auth/2fa/backup-codes
 * @access  Private
 */
exports.getNewBackupCodes = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    const { password } = req.body;
    
    try {
        const user = await User.findById(req.user._id);
        
        if (!user.twoFactorEnabled) {
            return res.status(400).json({
                success: false,
                message: '2FA is not enabled for this account'
            });
        }
        
        // Verify password for security
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password'
            });
        }
        
        // Generate new backup codes
        const backupCodes = generateBackupCodes();
        user.twoFactorBackupCodes = backupCodes;
        await user.save();
        
        // Return plain backup codes to user
        const plainBackupCodes = backupCodes.map(code => code.code);
        
        res.json({
            success: true,
            message: 'New backup codes generated',
            backupCodes: plainBackupCodes
        });
    } catch (err) {
        console.error('Generate new backup codes error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while generating new backup codes'
        });
    }
};
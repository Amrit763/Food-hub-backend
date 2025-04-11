const User = require('../models/user.model');
const ChefProfile = require('../models/chef.profile.model');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const sendEmail = require('../utils/email');
const emailTemplates = require('../utils/email-templates');



// Generate JWT token
const generateToken = (id) => {
    console.log('Generating token with secret key:', config.jwtSecretKey.substring(0, 5) + '...');
    return jwt.sign({ id }, config.jwtSecretKey, {
        expiresIn: config.jwtExpiresIn
    });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
exports.register = async (req, res) => {
    console.log('REGISTRATION ATTEMPT:');
    console.log('Request body:', {
        fullName: req.body.fullName,
        email: req.body.email,
        // Don't log the password
        hasPassword: !!req.body.password
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    const { fullName, email, password } = req.body;

    try {
        // Check if user already exists
        console.log('Checking if user already exists:', email);
        let user = await User.findOne({ email });

        if (user) {
            console.log('User already exists with email:', email);
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        console.log('Creating new user with email:', email);
        // Create new user
        user = new User({
            fullName,
            email,
            password,
            isEmailVerified: false
        });

        // Generate verification token
        console.log('Generating email verification token...');
        const verificationToken = user.generateEmailVerificationToken();
        console.log('Token generated successfully (masked):', verificationToken.substring(0, 5) + '...');

        await user.save();
        console.log('User saved to database with ID:', user._id.toString());

        // Create verification URL
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;
        console.log('Verification URL:', verificationUrl);
        console.log('This URL can be used for manual verification during testing');

        // Get email template
        console.log('Getting email template...');
        const emailTemplate = emailTemplates.emailVerification({
            fullName: user.fullName,
            verificationUrl
        });
        console.log('Email template generated');

        // Send verification email
        console.log('Attempting to send verification email to:', user.email);
        try {
            await sendEmail({
                email: user.email,
                subject: emailTemplate.subject,
                message: emailTemplate.text,
                html: emailTemplate.html
            });
            console.log('Verification email sent successfully');
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError.message);
            console.error('User was created but email could not be sent');
            // We don't want to return an error to the client here,
            // as the user was successfully created
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please check your email to verify your account.',
            userId: user._id
        });
    } catch (err) {
        console.error('Register error:', err.message);
        console.error(err.stack);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// @route   GET /api/auth/verify-email/:token
// @desc    Verify user email
// @access  Public
exports.verifyEmail = async (req, res) => {
    try {
        // Get hashed token
        const emailVerificationToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        // Find user by token and check if token is expired
        const user = await User.findOne({
            emailVerificationToken,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Email verification token is invalid or has expired'
            });
        }

        // Update user verification status
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Send verification success email
        const loginUrl = `${config.clientUrl}/login`;
        const emailTemplate = emailTemplates.emailVerificationSuccess({
            fullName: user.fullName,
            loginUrl
        });

        // Send success email
        await sendEmail({
            email: user.email,
            subject: emailTemplate.subject,
            message: emailTemplate.text,
            html: emailTemplate.html
        });

        // Create a redirect URL to the client app's login page
        const clientRedirectUrl = `${config.clientUrl}/login?verified=true`;

        // Option 1: Redirect to the client app (preferred for user experience)
        res.redirect(clientRedirectUrl);

        // Option 2: Return JSON response (useful for API testing in Postman)
        /*
        res.json({
            success: true,
            message: 'Email verified successfully. You can now log in.',
            token
        });
        */
    } catch (err) {
        console.error('Email verification error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during email verification'
        });
    }
};

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
exports.resendVerificationEmail = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    const { email } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User with this email does not exist'
            });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email is already verified'
            });
        }

        // Generate new verification token
        const verificationToken = user.generateEmailVerificationToken();

        await user.save();

        // Create verification URL
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;

        // Get email template
        const emailTemplate = emailTemplates.emailVerification({
            fullName: user.fullName,
            verificationUrl
        });

        // Send verification email
        await sendEmail({
            email: user.email,
            subject: emailTemplate.subject,
            message: emailTemplate.text,
            html: emailTemplate.html
        });

        res.json({
            success: true,
            message: 'Verification email resent successfully'
        });
    } catch (err) {
        console.error('Resend verification error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during resend verification'
        });
    }
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
exports.login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });

        // Check if user exists
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Compare passwords
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if email is verified (except for admin users)
        if (!user.isEmailVerified && user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: 'Please verify your email before logging in',
                needsVerification: true,
                email: user.email
            });
        }

        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
            // If 2FA is enabled, return a response indicating 2FA is required
            return res.json({
                success: true,
                requiresTwoFactor: true,
                email: user.email,  // Send back email for the second step, but don't send a token yet
                message: 'Please enter your 2FA code to complete login'
            });
        }

        // If 2FA is not enabled, continue with normal login flow
        // Generate token
        const token = generateToken(user._id);

        // Return user data (excluding password)
        const userData = await User.findById(user._id).select('-password');

        res.json({
            success: true,
            token,
            user: userData
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
exports.getCurrentUser = async (req, res) => {
    try {
        // req.user is set by the auth middleware
        const user = await User.findById(req.user._id).select('-password');
        
        // If user is a chef, get chef profile data
        let chefProfile = null;
        if (user.role === 'chef') {
            chefProfile = await ChefProfile.findOne({ user: user._id });
        }
        
        res.json({
            success: true,
            user,
            chefProfile
        });
    } catch (err) {
        console.error('Get current user error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @route   POST /api/auth/forgot-password
// @desc    Send a password reset email
// @access  Public
exports.forgotPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        const { email } = req.body;
        
        console.log(`Forgot password request for email: ${email}`);
        
        const user = await User.findOne({ email });

        if (!user) {
            console.log(`No user found with email: ${email}`);
            return res.status(404).json({
                success: false,
                message: 'No user found with this email address'
            });
        }

        // Generate reset token
        const resetToken = user.generatePasswordResetToken();
        console.log(`Generated reset token: ${resetToken.substring(0, 5)}...`);

        await user.save();
        console.log(`Saved reset token for user: ${email}`);

        // HARD-CODE the URL directly to the frontend
        // Don't create a backend API URL at all
        const hardcodedFrontendUrl = `http://localhost:4200/auth/reset-password/${resetToken}`;
        console.log(`Hard-coded Frontend URL: ${hardcodedFrontendUrl}`);

        // Get email template with the HARDCODED frontend URL directly
        const emailTemplate = emailTemplates.passwordReset({
            fullName: user.fullName,
            resetUrl: hardcodedFrontendUrl // Pass the frontend URL directly
        });

        // Log the URLs in the email template to verify
        console.log("Email template text URL:", emailTemplate.text.includes(hardcodedFrontendUrl));
        console.log("Email template HTML URL:", emailTemplate.html.includes(hardcodedFrontendUrl));

        // Send email
        try {
            await sendEmail({
                email: user.email,
                subject: emailTemplate.subject,
                message: emailTemplate.text,
                html: emailTemplate.html
            });
            
            console.log(`Password reset email sent to: ${email}`);
            
            res.json({
                success: true,
                message: 'Password reset email sent. Please check your inbox.'
            });
        } catch (emailErr) {
            console.error('Send password reset email error:', emailErr);
            
            // Reset fields in case of email error
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            
            return res.status(500).json({
                success: false,
                message: 'Error sending password reset email. Please try again.'
            });
        }
    } catch (err) {
        console.error('Forgot password error:', err.message);
        
        res.status(500).json({
            success: false,
            message: 'Server error during password reset request'
        });
    }
};
// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
exports.resetPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        console.log(`Attempting to reset password with token: ${req.params.token}`);
        
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');
        
        console.log(`Hashed token for lookup: ${resetPasswordToken.substring(0, 10)}...`);

        // Find user by token and check if token is expired
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            console.log('Invalid or expired reset token');
            return res.status(400).json({
                success: false,
                message: 'Password reset token is invalid or has expired'
            });
        }

        console.log(`Found user with reset token: ${user.email}`);

        const { password } = req.body;

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();
        console.log(`Password reset successful for ${user.email}`);

        // Generate new token
        const token = generateToken(user._id);

        // Send confirmation email
        const loginUrl = `${config.clientUrl}/login`;
        const emailTemplate = emailTemplates.passwordResetSuccess({
            fullName: user.fullName,
            loginUrl
        });

        try {
            await sendEmail({
                email: user.email,
                subject: emailTemplate.subject,
                message: emailTemplate.text,
                html: emailTemplate.html
            });
            console.log(`Password reset confirmation email sent to ${user.email}`);
        } catch (emailErr) {
            console.error('Error sending reset confirmation email:', emailErr);
            // Continue despite email error - password was reset successfully
        }

        res.json({
            success: true,
            message: 'Password has been reset successfully',
            token
        });
    } catch (err) {
        console.error('Reset password error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during password reset'
        });
    }
};

// @route   POST /api/auth/change-password
// @desc    Change password for logged in user
// @access  Private
exports.changePassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        const { currentPassword, newPassword } = req.body;

        // Get user with password
        const user = await User.findById(req.user._id);

        // Check if current password matches
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Set new password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (err) {
        console.error('Change password error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during password change'
        });
    }
};

// @route   GET /api/auth/test-token
// @desc    Test token validation
// @access  Private
exports.testToken = (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        user: req.user
    });
};
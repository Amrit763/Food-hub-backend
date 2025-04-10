const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validation = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const User = require('../models/user.model');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
    '/register',
    validation.registerValidation,
    authController.register
);

// @route   GET /api/auth/verify-email/:token
// @desc    Verify user email
// @access  Public
router.get(
    '/verify-email/:token',
    authController.verifyEmail
);

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post(
    '/resend-verification',
    validation.emailValidation,
    authController.resendVerificationEmail
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
    '/login',
    validation.loginValidation,
    authController.login
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get(
    '/me',
    authenticate,
    authController.getCurrentUser
);

// @route   POST /api/auth/forgot-password
// @desc    Send a password reset email
// @access  Public
router.post(
    '/forgot-password',
    validation.forgotPasswordValidation,
    authController.forgotPassword
);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post(
    '/reset-password/:token',
    validation.resetPasswordValidation,
    authController.resetPassword
);

// @route   POST /api/auth/change-password
// @desc    Change password for logged in user
// @access  Private
router.post(
    '/change-password',
    authenticate,
    validation.changePasswordValidation,
    authController.changePassword
);

// @route   GET /api/auth/test-token
// @desc    Test token validation
// @access  Private
router.get(
    '/test-token',
    authenticate,
    authController.testToken
);

// DEVELOPMENT ROUTES - Remove these in production
if (process.env.NODE_ENV !== 'production') {
    // @route   GET /api/auth/dev/verify-all
    // @desc    Verify all unverified emails (DEVELOPMENT ONLY)
    // @access  Public
    router.get(
        '/dev/verify-all',
        async (req, res) => {
            try {
                console.log('DEVELOPMENT ROUTE: Verifying all unverified emails');
                const result = await User.updateMany(
                    { isEmailVerified: false },
                    { 
                        $set: { 
                            isEmailVerified: true,
                            emailVerificationToken: null,
                            emailVerificationExpires: null
                        } 
                    }
                );
                
                console.log(`Updated ${result.nModified} users`);
                res.json({
                    success: true,
                    message: `Verified ${result.nModified} users`,
                    result
                });
            } catch (err) {
                console.error('Error verifying all users:', err);
                res.status(500).json({
                    success: false,
                    message: 'Server error during verification'
                });
            }
        }
    );

    // @route   GET /api/auth/dev/verify/:email
    // @desc    Verify a specific email (DEVELOPMENT ONLY)
    // @access  Public
    router.get(
        '/dev/verify/:email',
        async (req, res) => {
            try {
                const email = req.params.email;
                console.log(`DEVELOPMENT ROUTE: Verifying email ${email}`);
                
                const user = await User.findOne({ email });
                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }
                
                user.isEmailVerified = true;
                user.emailVerificationToken = null;
                user.emailVerificationExpires = null;
                await user.save();
                
                console.log(`User ${email} verified successfully`);
                res.json({
                    success: true,
                    message: `User ${email} verified successfully`
                });
            } catch (err) {
                console.error('Error verifying user:', err);
                res.status(500).json({
                    success: false,
                    message: 'Server error during verification'
                });
            }
        }
    );

    // @route   GET /api/auth/dev/debug-smtp
    // @desc    Test SMTP configuration (DEVELOPMENT ONLY)
    // @access  Public
    router.get(
        '/dev/debug-smtp',
        async (req, res) => {
            try {
                const config = require('../config');
                const sendEmail = require('../utils/email');
                
                console.log('DEVELOPMENT ROUTE: Debugging SMTP configuration');
                console.log('Current SMTP Configuration:');
                console.log(`Host: ${config.smtp.host}`);
                console.log(`Port: ${config.smtp.port}`);
                console.log(`Secure: ${config.smtp.secure}`);
                console.log(`Username: ${config.smtp.username}`);
                console.log(`Password set: ${config.smtp.password ? 'Yes' : 'No'}`);
                console.log(`From Name: ${config.smtp.fromName}`);
                console.log(`From Email: ${config.smtp.fromEmail}`);
                
                // Try sending a test email
                const to = req.query.email || config.smtp.username;
                console.log(`Attempting to send test email to: ${to}`);
                
                await sendEmail({
                    email: to,
                    subject: 'SMTP Test Email',
                    message: 'This is a test email to verify that your SMTP configuration is working correctly.',
                    html: '<h1>SMTP Test</h1><p>If you can see this email, your SMTP configuration is working!</p>'
                });
                
                res.json({
                    success: true,
                    message: `Test email sent to ${to}. Check your inbox and server logs.`
                });
            } catch (err) {
                console.error('SMTP Debug Error:', err);
                res.status(500).json({
                    success: false,
                    message: `SMTP Test Failed: ${err.message}`,
                    error: err.stack
                });
            }
        }
    );
}

module.exports = router;
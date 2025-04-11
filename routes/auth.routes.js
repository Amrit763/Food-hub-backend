const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validation = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const User = require('../models/user.model');
const crypto = require('crypto');

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

// TEMPORARY: Add a GET route that serves an HTML form for resetting passwords
// @route   GET /api/auth/reset-password/:token
// @desc    Display password reset form (for testing only)
// @access  Public
router.get(
    '/reset-password/:token',
    (req, res) => {
        const token = req.params.token;
        // Send an HTML form for testing
        // res.send(`
        //     <html>
        //         <head>
        //             <title>Reset Password</title>
        //             <style>
        //                 body { font-family: Arial; max-width: 500px; margin: 20px auto; padding: 20px; }
        //                 .form-group { margin-bottom: 15px; }
        //                 label { display: block; margin-bottom: 5px; }
        //                 input { width: 100%; padding: 8px; }
        //                 button { padding: 10px 15px; background: #4CAF50; color: white; border: none; cursor: pointer; }
        //                 .message { padding: 10px; margin: 10px 0; border-radius: 4px; display: none; }
        //                 .error { background-color: #f8d7da; color: #721c24; }
        //                 .success { background-color: #d4edda; color: #155724; }
        //             </style>
        //         </head>
        //         <body>
        //             <h2>Reset Your Password</h2>
        //             <div id="message" class="message"></div>
        //             <form id="resetForm">
        //                 <div class="form-group">
        //                     <label for="password">New Password</label>
        //                     <input type="password" id="password" required minlength="6">
        //                 </div>
        //                 <div class="form-group">
        //                     <label for="confirmPassword">Confirm Password</label>
        //                     <input type="password" id="confirmPassword" required minlength="6">
        //                 </div>
        //                 <button type="submit">Reset Password</button>
        //             </form>

        //             <script>
        //                 document.getElementById('resetForm').addEventListener('submit', async function(e) {
        //                     e.preventDefault();
                            
        //                     const password = document.getElementById('password').value;
        //                     const confirmPassword = document.getElementById('confirmPassword').value;
        //                     const messageEl = document.getElementById('message');
                            
        //                     if (password !== confirmPassword) {
        //                         messageEl.textContent = 'Passwords do not match';
        //                         messageEl.className = 'message error';
        //                         messageEl.style.display = 'block';
        //                         return;
        //                     }
                            
        //                     try {
        //                         const response = await fetch('/api/auth/reset-password/${token}', {
        //                             method: 'POST',
        //                             headers: {
        //                                 'Content-Type': 'application/json',
        //                             },
        //                             body: JSON.stringify({
        //                                 password,
        //                                 confirmPassword
        //                             }),
        //                         });
                                
        //                         const data = await response.json();
                                
        //                         if (response.ok) {
        //                             messageEl.textContent = data.message || 'Password reset successful';
        //                             messageEl.className = 'message success';
                                    
        //                             // Redirect to login after 3 seconds
        //                             setTimeout(() => {
        //                                 window.location.href = '/login';
        //                             }, 3000);
        //                         } else {
        //                             messageEl.textContent = data.message || 'Error resetting password';
        //                             messageEl.className = 'message error';
        //                         }
                                
        //                         messageEl.style.display = 'block';
        //                     } catch (error) {
        //                         messageEl.textContent = 'An error occurred';
        //                         messageEl.className = 'message error';
        //                         messageEl.style.display = 'block';
        //                         console.error('Error:', error);
        //                     }
        //                 });
        //             </script>
        //         </body>
        //     </html>
        // `);
    }
);

// Keep your existing POST route afterwards
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

    // @route   GET /api/auth/dev/generate-reset-token/:email
    // @desc    Generate password reset token for a user (DEVELOPMENT ONLY)
    // @access  Public
    router.get(
        '/dev/generate-reset-token/:email',
        async (req, res) => {
            try {
                const email = req.params.email;
                console.log(`DEVELOPMENT ROUTE: Generating reset token for ${email}`);
                
                const user = await User.findOne({ email });
                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }
                
                // Generate reset token
                const resetToken = crypto.randomBytes(20).toString('hex');
                
                // Hash token and set to resetPasswordToken field
                user.resetPasswordToken = crypto
                    .createHash('sha256')
                    .update(resetToken)
                    .digest('hex');
                
                // Set expiry (1 hour)
                user.resetPasswordExpires = Date.now() + 3600000;
                
                await user.save();
                
                const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
                
                console.log(`User ${email} reset token generated`);
                console.log(`Reset URL: ${resetUrl}`);
                
                res.json({
                    success: true,
                    message: `Reset token generated for ${email}`,
                    resetToken,
                    resetUrl
                });
            } catch (err) {
                console.error('Error generating reset token:', err);
                res.status(500).json({
                    success: false,
                    message: 'Server error during reset token generation'
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
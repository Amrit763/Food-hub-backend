const { generateToken } = require('../utils/token');
const User = require('../models/user.model');

// @route   GET /api/auth/google/callback
// @desc    Handle Google OAuth callback
// @access  Public
exports.googleCallback = (req, res) => {
    try {
        // User is already authenticated at this point by Passport
        const token = generateToken(req.user._id);
        
        // Define your frontend URL where you'll handle the authentication redirect
        const clientRedirectUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        
        // You have two options:
        
        // Option 1: Redirect to your frontend with token in URL parameters
        // This is simple but less secure - only use in development
        res.redirect(`${clientRedirectUrl}/auth/google/success?token=${token}`);
        
        // Option 2: Set token in cookies and redirect (more secure)
        // This is better for production
        /*
        // Set HTTP-only cookie with the token
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use secure in production
            sameSite: 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days, match your JWT expiry
        });
        
        // Redirect to the frontend
        res.redirect(`${clientRedirectUrl}/auth/google/success`);
        */
    } catch (err) {
        console.error('Google callback error:', err);
        
        // Redirect to frontend error page
        const clientRedirectUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        res.redirect(`${clientRedirectUrl}/auth/google/error`);
    }
};

// @route   GET /api/auth/google/success
// @desc    Return user data after successful Google login (for API use)
// @access  Private
exports.googleSuccess = async (req, res) => {
    try {
        // User is attached to request by auth middleware
        const user = await User.findById(req.user._id).select('-password');
        
        res.json({
            success: true,
            user
        });
    } catch (err) {
        console.error('Google success page error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @route   GET /api/auth/google/failure
// @desc    Handle Google OAuth failure
// @access  Public
exports.googleFailure = (req, res) => {
    res.status(401).json({
        success: false,
        message: 'Google authentication failed'
    });
};
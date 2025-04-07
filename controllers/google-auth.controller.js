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
        
        // Changed the redirect URL to include /api prefix to match your existing routes
        res.redirect(`/api/auth/google/success?token=${token}`);
        
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
        // Modified to handle token in query parameters
        const token = req.query.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        // Verify token and get user data
        const jwt = require('jsonwebtoken');
        const config = require('../config');
        
        try {
            const decoded = jwt.verify(token, config.jwtSecretKey);
            const user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.json({
                success: true,
                token,
                user
            });
        } catch (verifyErr) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
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
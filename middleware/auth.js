const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/user.model');

// Authenticate user from JWT token
// Updated authenticate function in auth.js
exports.authenticate = async (req, res, next) => {
    // Get token from various possible headers
    const token = 
        req.header('x-auth-token') || 
        req.header('Authorization')?.replace('Bearer ', '') ||
        req.header('authorization')?.replace('Bearer ', '');

    // Check if no token
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token, authorization denied'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, config.jwtSecretKey);
        
        // Set user from payload
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if email is verified (except for admin users)
        if (!user.isEmailVerified && user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: 'Email verification required',
                needsVerification: true,
                email: user.email
            });
        }
        
        req.user = user;
        next();
    } catch (err) {
        console.error('Authentication error:', err.message);
        
        res.status(401).json({
            success: false,
            message: 'Token is not valid'
        });
    }
};

// Check if user is an admin
exports.isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied: Admin privileges required'
        });
    }
    next();
};

// Check if user is a chef
exports.isChef = (req, res, next) => {
    if (req.user.role !== 'chef' && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied: Chef privileges required'
        });
    }
    next();
};

// Check if user is the owner of the resource or an admin
exports.isOwnerOrAdmin = (paramIdField) => {
    return (req, res, next) => {
        const resourceId = req.params[paramIdField];
        
        // Admin can access all resources
        if (req.user.role === 'admin') {
            return next();
        }
        
        // User can access only their own resource
        if (req.user._id.toString() !== resourceId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Not the owner of this resource'
            });
        }
        
        next();
    };
};
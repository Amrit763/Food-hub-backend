const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const config = require('../config');

// Middleware to verify user token and attach user to request
exports.authenticate = async (req, res, next) => {
    try {
        // Get token from header
        let token = '';
        
        // Check various places for token
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            // Format: Bearer <token>
            token = req.headers.authorization.split(' ')[1];
        } else if (req.headers['x-access-token']) {
            token = req.headers['x-access-token'];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        
        // Check if token exists
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. No token provided.'
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, config.jwtSecretKey);
        
        // Find user by id
        const user = await User.findById(decoded.id).select('-password');
        
        // Check if user exists
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User associated with this token no longer exists'
            });
        }
        
        // Attach user to request
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required'
        });
    }
};

// Middleware to check if user is chef
exports.isChef = (req, res, next) => {
    if (req.user && (req.user.role === 'chef' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Chef privileges required'
        });
    }
};

// Middleware to check if user is accessing their own resource or is admin
exports.isOwnerOrAdmin = (paramIdField) => {
    return (req, res, next) => {
        const paramId = req.params[paramIdField];
        if (
            (req.user && req.user._id.toString() === paramId) || 
            (req.user && req.user.role === 'admin')
        ) {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only access your own resources'
            });
        }
    };
};
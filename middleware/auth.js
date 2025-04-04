const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const config = require('../config');

// Middleware to verify user token and attach user to request
exports.authenticate = async (req, res, next) => {
    try {
        // Get token from header
        let token = '';
        
        console.log('Headers:', req.headers); // Debug headers
        
        // Check various places for token
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            // Format: Bearer <token>
            token = req.headers.authorization.split(' ')[1];
            console.log('Token extracted from Authorization header:', token.substring(0, 20) + '...');
        } else if (req.headers['x-access-token']) {
            token = req.headers['x-access-token'];
            console.log('Token extracted from x-access-token header');
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
            console.log('Token extracted from cookies');
        }
        
        // Check if token exists
        if (!token) {
            console.log('No token found in request');
            return res.status(401).json({
                success: false,
                message: 'Authentication required. No token provided.'
            });
        }
        
        console.log('Using JWT Secret Key:', config.jwtSecretKey.substring(0, 5) + '...');
        
        // Verify token
        try {
            const decoded = jwt.verify(token, config.jwtSecretKey);
            console.log('Token successfully verified. User ID:', decoded.id);
            
            // Find user by id
            const user = await User.findById(decoded.id).select('-password');
            
            // Check if user exists
            if (!user) {
                console.log('User not found for ID:', decoded.id);
                return res.status(401).json({
                    success: false,
                    message: 'User associated with this token no longer exists'
                });
            }
            
            console.log('User authenticated:', user._id.toString());
            // Attach user to request
            req.user = user;
            next();
        } catch (tokenErr) {
            console.error('Token verification error:', tokenErr.message);
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
    } catch (err) {
        console.error('Authentication middleware error:', err);
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
const jwt = require('jsonwebtoken');
const config = require('../config');

// Generate JWT token
exports.generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        config.jwtSecretKey,
        { expiresIn: config.jwtExpiresIn }
    );
};
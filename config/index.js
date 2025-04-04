require('dotenv').config();

module.exports = {
    port: process.env.PORT || 9999,
    saltRounds: 10,
    jwtSecretKey: process.env.JWT_SECRET || 'your_jwt_secret_key',
    jwtExpiresIn: '7d',
    
    // MongoDB connection
    mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/foodhub',
    
    // Email configuration
    email: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD
    },
    
    // First admin configuration
    firstAdmin: {
        fullName: process.env.FIRST_ADMIN_NAME || 'Admin User',
        email: process.env.FIRST_ADMIN_EMAIL || 'admin@foodhub.com',
        password: process.env.FIRST_ADMIN_PASSWORD || 'admin123456'
    }
};
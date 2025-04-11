// Add this to your config/index.js file
require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    saltRounds: 10,
    // Use one consistent name - jwtSecretKey
    jwtSecretKey: process.env.JWT_SECRET || 'your_jwt_secret_key',
    // Add jwtSecret as an alias to ensure backward compatibility
    get jwtSecret() {
        return this.jwtSecretKey;
    },
    jwtExpiresIn: '7d',
    
    // MongoDB connection
    mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/foodhub',
    
    // Client URL for reset password links
    clientUrl: process.env.CLIENT_URL || 'http://localhost:4200',
    
    // Email configuration
    email: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD
    },
    
    // SMTP configuration for the email.js utility with detailed logging
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true' || false,
        username: process.env.SMTP_USERNAME || process.env.EMAIL_USER || '',
        password: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD || '',
        fromName: process.env.SMTP_FROM_NAME || 'Food Hub',
        fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || process.env.EMAIL_USER || 'noreply@foodhub.com'
    },
    
    // First admin configuration
    firstAdmin: {
        fullName: process.env.FIRST_ADMIN_NAME || 'Admin User',
        email: process.env.FIRST_ADMIN_EMAIL || 'admin@foodhub.com',
        password: process.env.FIRST_ADMIN_PASSWORD || 'Admin@123456'
    },
    
    // Log SMTP configuration on startup (without showing the full password)
    logConfig: function() {
        console.log('==== SERVER CONFIGURATION ====');
        console.log(`Port: ${this.port}`);
        console.log(`Client URL: ${this.clientUrl}`);
        console.log('SMTP Configuration:');
        console.log(`  Host: ${this.smtp.host}`);
        console.log(`  Port: ${this.smtp.port}`);
        console.log(`  Secure: ${this.smtp.secure}`);
        console.log(`  Username: ${this.smtp.username}`);
        console.log(`  Password Set: ${this.smtp.password ? 'Yes' : 'No'}`);
        console.log(`  From Name: ${this.smtp.fromName}`);
        console.log(`  From Email: ${this.smtp.fromEmail}`);
        console.log('=============================');
    }
};
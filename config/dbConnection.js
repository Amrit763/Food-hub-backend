const mongoose = require('mongoose');
const config = require('./index');
const User = require('../models/user.model');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(config.mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false
        });
        
        console.log('MongoDB Connected Successfully');
        
        // Check if admin user exists, if not create one
        await createFirstAdminIfNeeded();
        
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        // Exit process with failure
        process.exit(1);
    }
};

// Create first admin user if no admin exists
const createFirstAdminIfNeeded = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (!adminExists) {
            console.log('No admin user found. Creating first admin user...');
            
            await User.create({
                fullName: config.firstAdmin.fullName,
                email: config.firstAdmin.email,
                password: config.firstAdmin.password,
                role: 'admin',
                isEmailVerified: true // Admin is automatically verified
            });
            
            console.log('First admin user created successfully');
        }
    } catch (err) {
        console.error('Error creating first admin:', err.message);
    }
};

module.exports = connectDB;
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');
const googleConfig = require('../config/google-auth');
const { generateToken } = require('../utils/token');

console.log('====== GOOGLE AUTH CONFIGURATION ======');
console.log(`Client ID: ${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...`);
console.log(`Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? 'Loaded (not showing for security)' : 'NOT LOADED'}`);
console.log(`Callback URL: ${process.env.GOOGLE_CALLBACK_URL}`);
console.log('=======================================');

// Serialize user to session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: googleConfig.clientID,
    clientSecret: googleConfig.clientSecret,
    callbackURL: googleConfig.callbackURL,
    passReqToCallback: true
},
async (req, accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });
        
        // If user doesn't exist, check if email is already in use
        if (!user) {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            
            if (email) {
                // Check if email is already registered
                const existingUser = await User.findOne({ email });
                
                if (existingUser) {
                    // Link Google account to existing user
                    existingUser.googleId = profile.id;
                    existingUser.googleProfile = profile;
                    existingUser.isEmailVerified = true; // Google verifies emails
                    
                    // If user doesn't have a profile image, use Google's
                    if (!existingUser.profileImage && profile.photos && profile.photos[0]) {
                        existingUser.profileImage = profile.photos[0].value;
                    }
                    
                    await existingUser.save();
                    return done(null, existingUser);
                }
            }
            
            // Create new user
            user = new User({
                googleId: profile.id,
                googleProfile: profile,
                email: email,
                fullName: profile.displayName,
                isEmailVerified: true, // Google verifies emails
                profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : null
            });
            
            await user.save();
        } else {
            // Update existing Google user with fresh profile data
            user.googleProfile = profile;
            
            // Make sure email is up to date
            if (profile.emails && profile.emails[0]) {
                user.email = profile.emails[0].value;
            }
            
            // Update profile image if available
            if (profile.photos && profile.photos[0]) {
                user.profileImage = profile.photos[0].value;
            }
            
            await user.save();
        }
        
        return done(null, user);
    } catch (err) {
        console.error('Google auth error:', err);
        return done(err, null);
    }
}));

module.exports = passport;
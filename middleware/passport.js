const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');
const googleConfig = require('../config/google-auth');

// Configure Passport
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: googleConfig.clientID,
    clientSecret: googleConfig.clientSecret,
    callbackURL: googleConfig.callbackURL,
    proxy: true // For handling proxies in production
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists in our database
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
            // User exists, update Google ID if not already set
            if (!user.googleId) {
                user.googleId = profile.id;
                await user.save();
            }
            
            // Always mark Google-authenticated users as email verified
            if (!user.isEmailVerified) {
                user.isEmailVerified = true;
                await user.save();
            }
            
            return done(null, user);
        }
        
        // If user doesn't exist, create a new one
        user = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            fullName: profile.displayName,
            isEmailVerified: true // Auto-verify emails from Google auth
        });
        
        await user.save();
        return done(null, user);
        
    } catch (err) {
        console.error('Google auth error:', err);
        return done(err, null);
    }
}));

module.exports = passport;
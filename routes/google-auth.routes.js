const express = require('express');
const router = express.Router();
const passport = require('passport');
const googleAuthController = require('../controllers/google-auth.controller');
const { authenticate } = require('../middleware/auth');
const googleConfig = require('../config/google-auth');

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth flow
// @access  Public
router.get(
    '/google',
    passport.authenticate('google', {
        scope: googleConfig.scopes,
        prompt: 'select_account' // Force account selection
    })
);

// @route   GET /api/auth/google/callback
// @desc    Handle Google OAuth callback
// @access  Public
router.get(
    '/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/api/auth/google/failure'
    }),
    googleAuthController.googleCallback
);

// @route   GET /api/auth/google/success
// @desc    Return user data after successful Google login (for API use)
// @access  Private
router.get(
    '/google/success',
    authenticate,
    googleAuthController.googleSuccess
);

// @route   GET /api/auth/google/failure
// @desc    Handle Google OAuth failure
// @access  Public
router.get(
    '/google/failure',
    googleAuthController.googleFailure
);

module.exports = router;
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validation = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
    '/register',
    validation.registerValidation,
    authController.register
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
    '/login',
    validation.loginValidation,
    authController.login
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get(
    '/me',
    authenticate,
    authController.getCurrentUser
);

// @route   POST /api/auth/forgot-password
// @desc    Send a password reset email
// @access  Public
router.post(
    '/forgot-password',
    validation.forgotPasswordValidation,
    authController.forgotPassword
);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post(
    '/reset-password/:token',
    validation.resetPasswordValidation,
    authController.resetPassword
);

// @route   POST /api/auth/change-password
// @desc    Change password for logged in user
// @access  Private
router.post(
    '/change-password',
    authenticate,
    validation.changePasswordValidation,
    authController.changePassword
);

// @route   GET /api/auth/test-token
// @desc    Test token validation
// @access  Private
router.get(
    '/test-token',
    authenticate,
    authController.testToken
);

module.exports = router;
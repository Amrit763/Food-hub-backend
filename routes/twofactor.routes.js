// routes/twofactor.routes.js
const express = require('express');
const router = express.Router();
const twofactorController = require('../controllers/twofactor.controller');
const { authenticate } = require('../middleware/auth');
const { check } = require('express-validator');

/**
 * @route   GET /api/auth/2fa/setup
 * @desc    Generate 2FA secret and QR code
 * @access  Private
 */
router.get(
    '/setup',
    authenticate,
    twofactorController.setup2FA
);

/**
 * @route   POST /api/auth/2fa/verify
 * @desc    Verify and enable 2FA
 * @access  Private
 */
router.post(
    '/verify',
    [
        authenticate,
        check('token', 'Verification code is required').isLength({ min: 6, max: 6 }).isNumeric()
    ],
    twofactorController.verify2FA
);

/**
 * @route   POST /api/auth/2fa/validate
 * @desc    Validate 2FA token during login
 * @access  Public
 */
router.post(
    '/validate',
    [
        check('email', 'Valid email is required').isEmail(),
        check('token', 'Token must be 6 digits').optional().isLength({ min: 6, max: 6 }).isNumeric(),
        check('backupCode', 'Backup code must be valid').optional().isLength({ min: 8, max: 8 })
    ],
    twofactorController.validate2FA
);

/**
 * @route   DELETE /api/auth/2fa/disable
 * @desc    Disable 2FA
 * @access  Private
 */
router.delete(
    '/disable',
    [
        authenticate,
        check('password', 'Password is required').exists()
    ],
    twofactorController.disable2FA
);

/**
 * @route   POST /api/auth/2fa/backup-codes
 * @desc    Generate new backup codes
 * @access  Private
 */
router.post(
    '/backup-codes',
    [
        authenticate,
        check('password', 'Password is required').exists()
    ],
    twofactorController.getNewBackupCodes
);

// For testing purposes - alternative route for disabling 2FA using POST instead of DELETE
router.post(
    '/disable-post',
    [
        authenticate,
        check('password', 'Password is required').exists()
    ],
    twofactorController.disable2FA
);

module.exports = router;
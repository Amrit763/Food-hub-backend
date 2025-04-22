const { check } = require('express-validator');

// Email validation for resend verification
exports.emailValidation = [
    check('email', 'Please include a valid email').isEmail().normalizeEmail()
];

// User registration validation
exports.registerValidation = [
    check('fullName', 'Full name is required').not().isEmpty().trim(),
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must include uppercase, lowercase, number, and special character'),

    check('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

// Login validation
exports.loginValidation = [
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('password', 'Password is required').not().isEmpty()
];

// Change password validation
exports.changePasswordValidation = [
    check('currentPassword', 'Current password is required').not().isEmpty(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
];

// Forgot password validation
exports.forgotPasswordValidation = [
    check('email', 'Please include a valid email').isEmail().normalizeEmail()
];

// Reset password validation
exports.resetPasswordValidation = [
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
        .optional() // Make confirmPassword optional for API testing in Postman
];

// Update user validation - Make fields optional since we might just be uploading an image
exports.updateUserValidation = [
    check('fullName')
        .optional()
        .not().isEmpty().withMessage('Full name cannot be empty if provided')
        .trim(),
    
    check('phoneNumber')
        .optional()
        .trim()
];

// Chef application validation
exports.chefApplicationValidation = [
    (req, res, next) => {
        // Copy the preserved fields back to req.body if they exist
        if (req.formFields) {
            req.body.specialization = req.formFields.specialization;
            req.body.experience = req.formFields.experience;
            req.body.bio = req.formFields.bio;
            
            // Also restore certificateImages
            if (req.formFields.certificateImages) {
                req.body.certificateImages = req.formFields.certificateImages;
            }
            
            console.log('Restored all fields to req.body:', req.body);
        }
        next();
    },
    check('specialization')
        .notEmpty()
        .withMessage('Specialization is required')
        .trim(),
    
    check('experience')
        .notEmpty()
        .withMessage('Experience is required')
        .isNumeric()
        .withMessage('Experience must be a number')
        .custom(value => value >= 0)
        .withMessage('Experience must be a positive number'),
    
    check('bio')
        .notEmpty()
        .withMessage('Bio is required')
        .trim()
];

// 2FA validation
exports.twoFactorVerifyValidation = [
    check('token', 'Verification code must be 6 digits').isLength({ min: 6, max: 6 }).isNumeric()
];

exports.twoFactorValidateValidation = [
    check('email', 'Valid email is required').isEmail().normalizeEmail(),
    check('token', 'Token must be 6 digits').optional().isLength({ min: 6, max: 6 }).isNumeric(),
    check('backupCode', 'Backup code must be 8 characters').optional().isLength({ min: 8, max: 8 })
];

exports.twoFactorDisableValidation = [
    check('password', 'Password is required').exists()
];

exports.twoFactorBackupCodesValidation = [
    check('password', 'Password is required').exists()
];
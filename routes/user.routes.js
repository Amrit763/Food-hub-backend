const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, isAdmin, isOwnerOrAdmin } = require('../middleware/auth');
const validation = require('../middleware/validation');
const { handleProfileImageUpload } = require('../middleware/file-upload');

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get(
    '/',
    authenticate,
    isAdmin,
    userController.getAllUsers
);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin or own user only)
router.get(
    '/:id',
    authenticate,
    isOwnerOrAdmin('id'),
    userController.getUserById
);

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Private (Admin or own user only)
router.put(
    '/:id',
    authenticate,
    isOwnerOrAdmin('id'),
    validation.updateUserValidation,
    handleProfileImageUpload,
    userController.updateUser
);

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Private (Admin only)
router.delete(
    '/:id',
    authenticate,
    isAdmin,
    userController.deleteUser
);

// @route   PUT /api/users/:id/role
// @desc    Update user role (admin only)
// @access  Private/Admin
router.put(
    '/:id/role',
    authenticate,
    isAdmin,
    userController.updateUserRole
);

module.exports = router;
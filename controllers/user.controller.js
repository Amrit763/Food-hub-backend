const User = require('../models/user.model');
const { validationResult } = require('express-validator');

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        
        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (err) {
        console.error('Get all users error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users'
        });
    }
};

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin or own user only)
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user
        });
    } catch (err) {
        console.error('Get user by ID error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Private (Admin or own user only)
exports.updateUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        // Build update object
        const updateFields = {};
        
        if (req.body.fullName) updateFields.fullName = req.body.fullName;
        if (req.body.phoneNumber) updateFields.phoneNumber = req.body.phoneNumber;
        
        // Only admins can update user roles
        if (req.user.role === 'admin' && req.body.role) {
            updateFields.role = req.body.role;
        }
        
        // Find and update the user
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: updatedUser
        });
    } catch (err) {
        console.error('Update user error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during user update'
        });
    }
};

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
    try {
        // Find user by ID
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if trying to delete the only admin
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete the only admin user'
                });
            }
        }
        
        // Delete the user
        await user.remove();
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (err) {
        console.error('Delete user error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during user deletion'
        });
    }
};

// @route   PUT /api/users/:id/role
// @desc    Update user role (admin only)
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        
        // Validate role
        if (!['user', 'chef', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }
        
        // Find the user
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if trying to demote the only admin
        if (user.role === 'admin' && role !== 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot demote the only admin user'
                });
            }
        }
        
        // Update role
        user.role = role;
        await user.save();
        
        res.json({
            success: true,
            user: await User.findById(req.params.id).select('-password')
        });
    } catch (err) {
        console.error('Update user role error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during role update'
        });
    }
};
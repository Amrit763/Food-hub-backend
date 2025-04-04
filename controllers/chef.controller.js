const ChefProfile = require('../models/chef.profile.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');

// @route   POST /api/chefs/apply
// @desc    Apply to become a chef
// @access  Private (authenticated users)
// Inside the applyForChef function in chef.controller.js
exports.applyForChef = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        // Check if user already has a chef profile
        const existingProfile = await ChefProfile.findOne({ user: req.user._id });
        
        if (existingProfile) {
            return res.status(400).json({
                success: false,
                message: 'Chef application already exists'
            });
        }
        
        // Create new chef profile
        const { specialization, experience, bio } = req.body;
        
        const newChefProfile = new ChefProfile({
            user: req.user._id,
            specialization,
            experience,
            bio,
            certificateImages: req.body.certificateImages || [],
            portfolioImages: req.body.portfolioImages || []
        });
        
        // Save chef profile
        await newChefProfile.save();
        
        res.status(201).json({
            success: true,
            message: 'Chef application submitted successfully',
            profile: newChefProfile
        });
    } catch (err) {
        console.error('Chef application error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during chef application'
        });
    }
};


// @route   GET /api/chefs/applications
// @desc    Get all chef applications
// @access  Private/Admin
exports.getChefApplications = async (req, res) => {
    try {
        const applications = await ChefProfile.find({ isApproved: false })
            .populate('user', 'fullName email');
        
        res.json({
            success: true,
            count: applications.length,
            applications
        });
    } catch (err) {
        console.error('Get chef applications error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching chef applications'
        });
    }
};

// @route   PUT /api/chefs/applications/:id/approve
// @desc    Approve a chef application
// @access  Private/Admin
exports.approveChefApplication = async (req, res) => {
    try {
        // Find the application
        const application = await ChefProfile.findById(req.params.id);
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Chef application not found'
            });
        }
        
        // Update the application status
        application.isApproved = true;
        await application.save();
        
        // Update the user's role to chef
        await User.findByIdAndUpdate(
            application.user,
            { role: 'chef' }
        );
        
        res.json({
            success: true,
            message: 'Chef application approved successfully',
            application
        });
    } catch (err) {
        console.error('Approve chef application error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Chef application not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during chef application approval'
        });
    }
};

// @route   DELETE /api/chefs/applications/:id
// @desc    Reject a chef application
// @access  Private/Admin
exports.rejectChefApplication = async (req, res) => {
    try {
        // Find the application
        const application = await ChefProfile.findById(req.params.id);
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Chef application not found'
            });
        }
        
        // Delete the application
        await application.remove();
        
        res.json({
            success: true,
            message: 'Chef application rejected and removed'
        });
    } catch (err) {
        console.error('Reject chef application error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Chef application not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during chef application rejection'
        });
    }
};

// @route   GET /api/chefs
// @desc    Get all approved chefs
// @access  Public
exports.getAllChefs = async (req, res) => {
    try {
        const chefProfiles = await ChefProfile.find({ isApproved: true })
            .populate('user', 'fullName email profileImage');
        
        res.json({
            success: true,
            count: chefProfiles.length,
            chefs: chefProfiles
        });
    } catch (err) {
        console.error('Get all chefs error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching chefs'
        });
    }
};

// @route   GET /api/chefs/:id
// @desc    Get chef by ID
// @access  Public
exports.getChefById = async (req, res) => {
    try {
        const chefProfile = await ChefProfile.findOne({ 
            user: req.params.id,
            isApproved: true
        }).populate('user', 'fullName email profileImage');
        
        if (!chefProfile) {
            return res.status(404).json({
                success: false,
                message: 'Chef not found'
            });
        }
        
        res.json({
            success: true,
            chef: chefProfile
        });
    } catch (err) {
        console.error('Get chef by ID error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Chef not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error while fetching chef'
        });
    }
};

// @route   PUT /api/chefs/profile
// @desc    Update chef profile
// @access  Private (Chef only)
exports.updateChefProfile = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        // Find the chef profile
        let chefProfile = await ChefProfile.findOne({ user: req.user._id });
        
        if (!chefProfile) {
            return res.status(404).json({
                success: false,
                message: 'Chef profile not found'
            });
        }
        
        // Update fields
        const { specialization, experience, bio } = req.body;
        
        if (specialization) chefProfile.specialization = specialization;
        if (experience) chefProfile.experience = experience;
        if (bio) chefProfile.bio = bio;
        
        // Save updated profile
        await chefProfile.save();
        
        res.json({
            success: true,
            message: 'Chef profile updated successfully',
            profile: chefProfile
        });
    } catch (err) {
        console.error('Update chef profile error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during profile update'
        });
    }
};
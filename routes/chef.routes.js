const express = require('express');
const router = express.Router();
const chefController = require('../controllers/chef.controller');
const { authenticate, isAdmin, isChef } = require('../middleware/auth');
const validation = require('../middleware/validation');
const { 
    handleChefCertificatesUpload, 
    handleChefPortfolioUpload 
} = require('../middleware/file-upload');

const multer = require('multer');
const upload = multer({ dest: 'uploads/certificates/' });

// NEW ROUTE: Check application status
// @route   GET /api/chefs/profile/check
// @desc    Check if user has an existing chef application
// @access  Private (authenticated users)
router.get(
    '/profile/check',
    authenticate,
    chefController.checkUserApplication
);

// @route   POST /api/chefs/apply
// @desc    Apply to become a chef
// @access  Private (authenticated users)
router.post(
    '/apply',
    authenticate,
    handleChefCertificatesUpload, // File upload first
    handleChefPortfolioUpload,    // File upload second
    (req, res, next) => {
        // Debug middleware to log what's in the request body
        console.log('Request body after file middleware:', req.body);
        next();
    },
    validation.chefApplicationValidation, // Validation after files
    chefController.applyForChef
);

// @route   GET /api/chefs/applications
// @desc    Get all chef applications
// @access  Private/Admin
router.get(
    '/applications',
    authenticate,
    isAdmin,
    chefController.getChefApplications
);

// @route   PUT /api/chefs/applications/:id/approve
// @desc    Approve a chef application
// @access  Private/Admin
router.put(
    '/applications/:id/approve',
    authenticate,
    isAdmin,
    chefController.approveChefApplication
);

// @route   DELETE /api/chefs/applications/:id
// @desc    Reject a chef application
// @access  Private/Admin
router.delete(
    '/applications/:id',
    authenticate,
    isAdmin,
    chefController.rejectChefApplication
);

// @route   GET /api/chefs
// @desc    Get all approved chefs
// @access  Public
router.get(
    '/',
    chefController.getAllChefs
);

// @route   GET /api/chefs/:id
// @desc    Get chef by ID
// @access  Public
router.get(
    '/:id',
    chefController.getChefById
);

// @route   PUT /api/chefs/profile
// @desc    Update chef profile
// @access  Private (Chef only)
router.put(
    '/profile',
    authenticate,
    isChef,
    validation.chefApplicationValidation,
    handleChefPortfolioUpload,
    chefController.updateChefProfile
);

// Add this to your chef.routes.js file
router.post(
    '/test-upload',
    authenticate,
    (req, res, next) => {
        console.log('Before multer:', req.body);
        next();
    },
    multer().any(), // Process all fields
    (req, res) => {
        console.log('After multer:', req.body);
        res.json({
            success: true,
            receivedData: req.body,
            receivedFiles: req.files
        });
    }
);

module.exports = router;
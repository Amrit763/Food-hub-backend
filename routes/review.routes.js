// routes/review.routes.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const reviewController = require('../controllers/review.controller');
const { authenticate, isAdmin } = require('../middleware/auth');
const { handleReviewImagesUpload } = require('../middleware/file-upload');

// Create review validation
const createReviewValidation = [
    check('orderId', 'Order ID is required').notEmpty().isMongoId(),
    check('productId', 'Product ID is required').notEmpty().isMongoId(),
    check('rating', 'Rating must be between 1 and 5').isInt({ min: 1, max: 5 }),
    check('comment', 'Comment is required').notEmpty().trim()
];

// @route   POST /api/reviews
// @desc    Create a new review
// @access  Private
router.post(
    '/',
    authenticate,
    handleReviewImagesUpload,
    createReviewValidation,
    reviewController.createReview
);

// @route   GET /api/reviews/product/:id
// @desc    Get all reviews for a product
// @access  Public
router.get(
    '/product/:id',
    reviewController.getProductReviews
);

// @route   GET /api/reviews/user
// @desc    Get all reviews by current user
// @access  Private
router.get(
    '/user',
    authenticate,
    reviewController.getUserReviews
);

// @route   GET /api/reviews/chef/:id
// @desc    Get all reviews for a chef's products
// @access  Public
router.get(
    '/chef/:id',
    reviewController.getChefReviews
);

// @route   GET /api/reviews/:id
// @desc    Get review by ID
// @access  Public
router.get(
    '/:id',
    reviewController.getReviewById
);

// @route   PUT /api/reviews/:id
// @desc    Update a review
// @access  Private
router.put(
    '/:id',
    authenticate,
    handleReviewImagesUpload,
    [
        check('rating', 'Rating must be between 1 and 5').optional().isInt({ min: 1, max: 5 }),
        check('comment', 'Comment is required').optional().notEmpty().trim()
    ],
    reviewController.updateReview
);

// @route   DELETE /api/reviews/:id
// @desc    Delete a review
// @access  Private
router.delete(
    '/:id',
    authenticate,
    reviewController.deleteReview
);

module.exports = router;
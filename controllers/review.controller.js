// controllers/review.controller.js
const Review = require('../models/review.model');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const { validationResult } = require('express-validator');

// @route   POST /api/reviews
// @desc    Create a new review
// @access  Private
exports.createReview = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        const { orderId, productId, rating, comment, images } = req.body;

        // Verify the order exists and belongs to the user
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if the user is the order owner
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to review this order'
            });
        }

        // Check if the order is delivered
        if (order.status !== 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'Can only review orders that have been delivered'
            });
        }

        // Verify the product exists and was part of the order
        const productInOrder = order.items.some(item => 
            item.product.toString() === productId
        );

        if (!productInOrder) {
            return res.status(400).json({
                success: false,
                message: 'Product was not part of this order'
            });
        }

        // Check if product was already reviewed in this order
        const alreadyReviewed = order.reviewedItems && order.reviewedItems.some(item => 
            item.product.toString() === productId
        );
        
        if (alreadyReviewed) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this product for this order'
            });
        }

        // Create the review
        const newReview = new Review({
            user: req.user._id,
            product: productId,
            order: orderId,
            rating,
            comment,
            images: images || []
        });

        // Save review
        const savedReview = await newReview.save();

        // Update the order to mark this product as reviewed
        if (!order.reviewedItems) {
            order.reviewedItems = [];
        }
        
        order.reviewedItems.push({
            product: productId,
            reviewId: savedReview._id,
            reviewedAt: new Date()
        });
        
        await order.save();

        // Populate user information
        const populatedReview = await Review.findById(savedReview._id).populate({
            path: 'user',
            select: 'fullName profileImage'
        });

        // Update product rating average
        await updateProductRating(productId);

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            review: populatedReview
        });
    } catch (err) {
        console.error('Create review error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while creating review'
        });
    }
};

// @route   GET /api/reviews/product/:id
// @desc    Get all reviews for a product
// @access  Public
exports.getProductReviews = async (req, res) => {
    try {
        const productId = req.params.id;

        // Get all reviews for the product
        const reviews = await Review.find({ product: productId })
            .populate({
                path: 'user',
                select: 'fullName profileImage'
            })
            .sort('-createdAt');

        // Calculate rating stats
        const totalReviews = reviews.length;
        let totalRating = 0;
        const ratingCounts = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        };

        reviews.forEach(review => {
            totalRating += review.rating;
            ratingCounts[review.rating]++;
        });

        const averageRating = totalReviews > 0 ? (totalRating / totalReviews) : 0;
        
        // Calculate percentage for each rating
        const ratingPercentages = {};
        Object.keys(ratingCounts).forEach(rating => {
            ratingPercentages[rating] = totalReviews > 0 
                ? Math.round((ratingCounts[rating] / totalReviews) * 100) 
                : 0;
        });

        res.json({
            success: true,
            count: totalReviews,
            averageRating: parseFloat(averageRating.toFixed(1)),
            ratingCounts,
            ratingPercentages,
            reviews
        });
    } catch (err) {
        console.error('Get product reviews error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching reviews'
        });
    }
};

// @route   GET /api/reviews/user
// @desc    Get all reviews by current user
// @access  Private
exports.getUserReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.user._id })
            .populate({
                path: 'product',
                select: 'name images'
            })
            .populate({
                path: 'order',
                select: 'orderNumber'
            })
            .sort('-createdAt');

        res.json({
            success: true,
            count: reviews.length,
            reviews
        });
    } catch (err) {
        console.error('Get user reviews error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching reviews'
        });
    }
};

// @route   GET /api/reviews/chef/:id
// @desc    Get all reviews for a chef's products
// @access  Public
exports.getChefReviews = async (req, res) => {
    try {
        const chefId = req.params.id;

        // First, get all products by this chef
        const products = await Product.find({ chef: chefId }).select('_id');
        const productIds = products.map(product => product._id);

        // Get reviews for these products
        const reviews = await Review.find({ product: { $in: productIds } })
            .populate({
                path: 'user',
                select: 'fullName profileImage'
            })
            .populate({
                path: 'product',
                select: 'name images'
            })
            .sort('-createdAt');

        // Calculate average rating
        let totalRating = 0;
        reviews.forEach(review => {
            totalRating += review.rating;
        });

        const averageRating = reviews.length > 0 ? (totalRating / reviews.length) : 0;

        res.json({
            success: true,
            count: reviews.length,
            averageRating: parseFloat(averageRating.toFixed(1)),
            reviews
        });
    } catch (err) {
        console.error('Get chef reviews error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching reviews'
        });
    }
};

// @route   GET /api/reviews/:id
// @desc    Get review by ID
// @access  Public
exports.getReviewById = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id)
            .populate({
                path: 'user',
                select: 'fullName profileImage'
            })
            .populate({
                path: 'product',
                select: 'name images chef',
                populate: {
                    path: 'chef',
                    select: 'fullName'
                }
            });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        res.json({
            success: true,
            review
        });
    } catch (err) {
        console.error('Get review by ID error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @route   PUT /api/reviews/:id
// @desc    Update a review
// @access  Private
exports.updateReview = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        // Find the review
        let review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check ownership
        if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this review'
            });
        }

        // Update fields
        const { rating, comment, images } = req.body;
        
        if (rating) review.rating = rating;
        if (comment) review.comment = comment;
        if (images) review.images = images;
        
        review.updatedAt = Date.now();
        
        // Save updated review
        await review.save();
        
        // Populate user information
        const updatedReview = await Review.findById(review._id)
            .populate({
                path: 'user',
                select: 'fullName profileImage'
            });
            
        // Update product rating average
        await updateProductRating(review.product);

        res.json({
            success: true,
            message: 'Review updated successfully',
            review: updatedReview
        });
    } catch (err) {
        console.error('Update review error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error while updating review'
        });
    }
};

// @route   DELETE /api/reviews/:id
// @desc    Delete a review
// @access  Private
exports.deleteReview = async (req, res) => {
    try {
        // Find the review
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check ownership
        if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this review'
            });
        }

        // Store order ID and product ID for updates
        const orderId = review.order;
        const productId = review.product;

        // Remove review from order's reviewedItems
        await Order.findByIdAndUpdate(
            orderId,
            {
                $pull: {
                    reviewedItems: { reviewId: review._id }
                }
            }
        );

        // Delete review
        await Review.findByIdAndDelete(req.params.id);
        
        // Update product rating average
        await updateProductRating(productId);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (err) {
        console.error('Delete review error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error while deleting review'
        });
    }
};

// Helper function to update product rating
async function updateProductRating(productId) {
    try {
        // Get all reviews for the product
        const reviews = await Review.find({ product: productId });
        
        let totalRating = 0;
        reviews.forEach(review => {
            totalRating += review.rating;
        });
        
        // Calculate average rating
        const averageRating = reviews.length > 0 ? (totalRating / reviews.length) : 0;
        
        // Update product with new rating information
        await Product.findByIdAndUpdate(productId, {
            $set: {
                ratingAverage: parseFloat(averageRating.toFixed(1)),
                ratingCount: reviews.length
            }
        });
        
    } catch (error) {
        console.error('Error updating product rating:', error);
    }
}
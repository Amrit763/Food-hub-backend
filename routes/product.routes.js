const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate, isChef } = require('../middleware/auth');
const { handleProductImagesUpload } = require('../middleware/file-upload');

// @route   POST /api/products
// @desc    Create a new product
// @access  Private (Chef only)
router.post(
    '/',
    authenticate,
    isChef,
    handleProductImagesUpload,
    productController.createProduct
);

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get(
    '/',
    productController.getAllProducts
);

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get(
    '/search',
    productController.searchProducts
);

// @route   GET /api/products/chef/:id
// @desc    Get all products by a chef
// @access  Public
router.get(
    '/chef/:id',
    productController.getChefProducts
);

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get(
    '/:id',
    productController.getProductById
);

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private (Chef owner or Admin)
router.put(
    '/:id',
    authenticate,
    isChef,
    handleProductImagesUpload,
    productController.updateProduct
);

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (Chef owner or Admin)
router.delete(
    '/:id',
    authenticate,
    isChef,
    productController.deleteProduct
);

module.exports = router;
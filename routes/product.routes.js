const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const productCondimentsController = require('../controllers/product-condiments.controller');
const { authenticate, isChef } = require('../middleware/auth');
const { handleProductImagesUpload } = require('../middleware/file-upload');
const productValidation = require('../middleware/product-validation');
const { check } = require('express-validator');

// @route   POST /api/products
// @desc    Create a new product
// @access  Private (Chef only)
router.post(
    '/',
    authenticate,
    isChef,
    handleProductImagesUpload,
    productValidation.createProductValidation,
    productValidation.validate,
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
    productValidation.updateProductValidation,
    productValidation.validate,
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

// ===== CONDIMENT ROUTES =====

// @route   GET /api/products/:id/condiments
// @desc    Get all condiments for a product
// @access  Public
router.get(
    '/:id/condiments',
    productCondimentsController.getProductCondiments
);

// @route   POST /api/products/:id/condiments
// @desc    Add a condiment to a product
// @access  Private (Chef only)
router.post(
    '/:id/condiments',
    authenticate,
    isChef,
    [
        check('name', 'Condiment name is required').notEmpty().trim(),
        check('price', 'Condiment price must be a positive number').isFloat({ min: 0 }),
        check('isDefault', 'isDefault must be a boolean value').optional().isBoolean()
    ],
    productValidation.validate,
    productCondimentsController.addProductCondiment
);

// @route   PUT /api/products/:id/condiments/:condimentId
// @desc    Update a specific condiment
// @access  Private (Chef only)
router.put(
    '/:id/condiments/:condimentId',
    authenticate,
    isChef,
    [
        check('name', 'Condiment name must be a string').optional().notEmpty().trim(),
        check('price', 'Condiment price must be a positive number').optional().isFloat({ min: 0 }),
        check('isDefault', 'isDefault must be a boolean value').optional().isBoolean()
    ],
    productValidation.validate,
    productCondimentsController.updateProductCondiment
);

// @route   DELETE /api/products/:id/condiments/:condimentId
// @desc    Delete a specific condiment
// @access  Private (Chef only)
router.delete(
    '/:id/condiments/:condimentId',
    authenticate,
    isChef,
    productCondimentsController.deleteProductCondiment
);

module.exports = router;
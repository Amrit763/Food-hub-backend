// routes/price-calculator.routes.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const priceCalculatorController = require('../controllers/price-calculator.controller');

// @route   POST /api/calculate-price
// @desc    Calculate the price of a product with selected condiments
// @access  Public
router.post(
    '/calculate-price',
    [
        check('productId', 'Product ID is required').notEmpty().isMongoId(),
        check('quantity', 'Quantity must be a positive number').optional().isInt({ min: 1 }),
        check('selectedCondiments', 'Selected condiments must be an array').optional().isArray()
    ],
    priceCalculatorController.calculatePrice
);

// @route   POST /api/calculate-cart
// @desc    Calculate the totals for cart items
// @access  Public
router.post(
    '/calculate-cart',
    [
        check('items', 'Items array is required').isArray(),
        check('items.*.productId', 'Product ID is required for each item').isMongoId(),
        check('items.*.quantity', 'Quantity must be a positive number').optional().isInt({ min: 1 }),
        check('items.*.selectedCondiments', 'Selected condiments must be an array').optional().isArray()
    ],
    priceCalculatorController.calculateCart
);

module.exports = router;
const { check } = require('express-validator');

exports.addToCartValidation = [
    check('productId')
        .notEmpty().withMessage('Product ID is required')
        .isMongoId().withMessage('Invalid product ID format'),
    check('quantity')
        .optional()
        .isInt({ min: 1 }).withMessage('Quantity must be a positive number')
];

exports.updateCartValidation = [
    check('quantity')
        .notEmpty().withMessage('Quantity is required')
        .isInt({ min: 1 }).withMessage('Quantity must be a positive number')
];
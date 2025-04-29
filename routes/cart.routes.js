const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth');

// Apply authenticate middleware to each route individually
router.get('/', authenticate, cartController.getCart);

router.post('/', [
    authenticate,
    check('productId', 'Product ID is required').notEmpty().isMongoId(),
    check('quantity', 'Quantity must be a positive number').optional().isInt({ min: 1 })
], cartController.addToCart);

router.put('/:id', [
    authenticate,
    check('quantity', 'Quantity must be a positive number').optional().isInt({ min: 1 })
], cartController.updateCartItem);

// New route for updating just condiments
router.put('/:id/condiments', [
    authenticate,
    check('selectedCondiments', 'Selected condiments must be an array').isArray()
], cartController.updateCartItemCondiments);

router.delete('/:id', authenticate, cartController.removeFromCart);

router.delete('/', authenticate, cartController.clearCart);

module.exports = router;
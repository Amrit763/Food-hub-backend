// routes/orders.routes.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const orderController = require('../controllers/orders.controller');
const auth = require('../middleware/auth');

// Create order validation
const createOrderValidation = [
  check('deliveryAddress', 'Delivery address is required').not().isEmpty(),
  check('deliveryDate', 'Delivery date is required').not().isEmpty(),
  check('deliveryTime', 'Delivery time is required').not().isEmpty(),
  check('paymentMethod', 'Payment method is required').not().isEmpty()
];

// @route   POST /api/orders
// @desc    Create a new order from cart
// @access  Private
router.post(
  '/',
  auth.authenticate,
  createOrderValidation,
  orderController.createOrder
);

// @route   GET /api/orders/user
// @desc    Get all orders for current user
// @access  Private
router.get(
  '/user',
  auth.authenticate,
  orderController.getUserOrders
);

// @route   GET /api/orders/chef
// @desc    Get all orders for a chef
// @access  Private (Chef only)
router.get(
  '/chef',
  auth.authenticate,
  auth.isChef,
  orderController.getChefOrders
);

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get(
  '/:id',
  auth.authenticate,
  orderController.getOrderById
);

// @route   GET /api/orders/:id/can-review/:productId
// @desc    Check if a product can be reviewed by current user
// @access  Private
router.get(
  '/:id/can-review/:productId',
  auth.authenticate,
  orderController.canReviewProduct
);

// @route   PATCH /api/orders/:id/status
// @desc    Update order status
// @access  Private (Chef or Admin)
router.patch(
  '/:id/status',
  auth.authenticate,
  orderController.updateOrderStatus
);

// @route   PATCH /api/orders/:id/cancel
// @desc    Cancel an order (user only)
// @access  Private
router.patch(
  '/:id/cancel',
  auth.authenticate,
  orderController.cancelOrder
);

// @route   PATCH /api/orders/:id/delete
// @desc    Soft delete an order
// @access  Private
router.patch(
  '/:id/delete',
  auth.authenticate,
  (req, res, next) => {
    // Add delete action to the request body
    req.body.action = 'delete';
    next();
  },
  orderController.cancelOrder
);

// @route   DELETE /api/orders/:id
// @desc    Hard delete an order (admin only)
// @access  Private/Admin
router.delete(
  '/:id',
  auth.authenticate,
  auth.isAdmin,
  orderController.deleteOrder
);

module.exports = router;
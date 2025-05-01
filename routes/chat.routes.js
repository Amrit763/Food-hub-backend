// routes/chat.routes.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth');

// @route   POST /api/chats/order/:orderId
// @desc    Create chat channels for an order (called on checkout)
// @access  Private
router.post(
    '/order/:orderId',
    authenticate,
    chatController.createOrderChats
);

// @route   GET /api/chats
// @desc    Get all chats for the current user
// @access  Private
router.get(
    '/',
    authenticate,
    chatController.getUserChats
);

// @route   GET /api/chats/:id
// @desc    Get a specific chat with messages
// @access  Private
router.get(
    '/:id',
    authenticate,
    chatController.getChatById
);

// @route   POST /api/chats/:id/messages
// @desc    Send a message in a chat
// @access  Private
router.post(
    '/:id/messages',
    authenticate,
    [
        check('content', 'Message content is required').notEmpty().trim()
    ],
    chatController.sendMessage
);

// @route   DELETE /api/chats/:id/messages/:messageId
// @desc    Delete a message
// @access  Private
router.delete(
    '/:id/messages/:messageId',
    authenticate,
    chatController.deleteMessage
);

// @route   DELETE /api/chats/:id
// @desc    Delete a chat (mark as deleted for the user)
// @access  Private
router.delete(
    '/:id',
    authenticate,
    chatController.deleteChat
);

// @route   PATCH /api/chats/:id/read
// @desc    Mark all messages as read
// @access  Private
router.patch(
    '/:id/read',
    authenticate,
    chatController.markAsRead
);

module.exports = router;
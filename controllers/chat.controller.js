// controllers/chat.controller.js
const Chat = require('../models/chat.model');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @route   POST /api/chats/order/:orderId
// @desc    Create chat for an order (automatic on checkout)
// @access  Private
exports.createOrderChats = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.user._id;

        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Verify the user is the order owner
        if (order.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to create chats for this order'
            });
        }

        // Get all unique chefs in the order
        const chefIds = [...new Set(order.chefItems.map(item => item.chef.toString()))];

        // Create one chat per chef
        const chats = [];
        const chatPromises = chefIds.map(async (chefId) => {
            // Check if a chat already exists
            const existingChat = await Chat.findOne({
                order: orderId,
                customer: userId,
                chef: chefId
            });

            if (!existingChat) {
                const newChat = new Chat({
                    order: orderId,
                    customer: userId,
                    chef: chefId,
                    messages: []
                });

                const savedChat = await newChat.save();
                chats.push(savedChat);
            } else {
                chats.push(existingChat);
            }
        });

        await Promise.all(chatPromises);

        res.status(201).json({
            success: true,
            message: 'Chats created successfully',
            count: chats.length,
            chats
        });
    } catch (err) {
        console.error('Create order chats error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while creating chats'
        });
    }
};

// @route   GET /api/chats
// @desc    Get all chats for current user (customer or chef)
// @access  Private
exports.getUserChats = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        let query = {};
        
        // Different queries based on user role
        if (userRole === 'chef') {
            query = { 
                chef: userId,
                deletedBy: { $ne: userId } // Don't show chats the user has deleted
            };
        } else {
            query = { 
                customer: userId,
                deletedBy: { $ne: userId } // Don't show chats the user has deleted
            };
        }
        
        // Filter by active status if specified
        if (req.query.active === 'true') {
            query.isActive = true;
        } else if (req.query.active === 'false') {
            query.isActive = false;
        }

        const chats = await Chat.find(query)
            .populate({
                path: 'customer',
                select: 'fullName profileImage'
            })
            .populate({
                path: 'chef',
                select: 'fullName profileImage'
            })
            .populate({
                path: 'order',
                select: 'orderNumber status createdAt'
            })
            .sort('-lastActivity');

        // Process chats to show only non-deleted messages for this user
        const processedChats = chats.map(chat => {
            const chatObj = chat.toObject();
            // Filter out messages that were deleted by this user
            chatObj.messages = chatObj.messages.filter(msg => 
                !msg.deletedBy.some(id => id.toString() === userId.toString())
            );
            
            // Count unread messages
            chatObj.unreadCount = chatObj.messages.filter(msg => 
                msg.sender.toString() !== userId.toString() && 
                !msg.readBy.some(id => id.toString() === userId.toString())
            ).length;
            
            // Get last message if any exists
            chatObj.lastMessage = chatObj.messages.length > 0 
                ? chatObj.messages[chatObj.messages.length - 1] 
                : null;
                
            return chatObj;
        });

        res.json({
            success: true,
            count: processedChats.length,
            chats: processedChats
        });
    } catch (err) {
        console.error('Get user chats error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching chats'
        });
    }
};

// @route   GET /api/chats/:id
// @desc    Get a specific chat with messages
// @access  Private
exports.getChatById = async (req, res) => {
    try {
        const chatId = req.params.id;
        const userId = req.user._id;

        // Find the chat
        const chat = await Chat.findById(chatId)
            .populate({
                path: 'customer',
                select: 'fullName profileImage'
            })
            .populate({
                path: 'chef',
                select: 'fullName profileImage'
            })
            .populate({
                path: 'order',
                select: 'orderNumber status createdAt items.product',
                populate: {
                    path: 'items.product',
                    select: 'name images'
                }
            });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // Check authorization - user must be either the customer or chef
        if (chat.customer._id.toString() !== userId.toString() && 
            chat.chef._id.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this chat'
            });
        }

        // Check if chat was deleted by this user
        if (chat.deletedBy.some(id => id.toString() === userId.toString())) {
            return res.status(404).json({
                success: false,
                message: 'Chat has been deleted'
            });
        }

        // Filter out messages that were deleted by this user
        const chatObj = chat.toObject();
        chatObj.messages = chatObj.messages.filter(msg => 
            !msg.deletedBy.some(id => id.toString() === userId.toString())
        );

        // Mark all messages as read by this user
        await Chat.updateMany(
            { _id: chatId, 'messages.sender': { $ne: userId }, 'messages.readBy': { $ne: userId } },
            { $addToSet: { 'messages.$[elem].readBy': userId } },
            { arrayFilters: [{ 'elem.sender': { $ne: userId }, 'elem.readBy': { $ne: userId } }] }
        );

        res.json({
            success: true,
            chat: chatObj
        });
    } catch (err) {
        console.error('Get chat by ID error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @route   POST /api/chats/:id/messages
// @desc    Send a message in a chat
// @access  Private
exports.sendMessage = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        const chatId = req.params.id;
        const userId = req.user._id;
        const { content } = req.body;

        // Find the chat
        const chat = await Chat.findById(chatId)
            .populate({
                path: 'customer',
                select: 'fullName profileImage'
            })
            .populate({
                path: 'chef',
                select: 'fullName profileImage'
            });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // Check authorization - user must be either the customer or chef
        if (chat.customer._id.toString() !== userId.toString() && 
            chat.chef._id.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to send messages in this chat'
            });
        }

        // Check if chat was deleted by this user
        if (chat.deletedBy.some(id => id.toString() === userId.toString())) {
            return res.status(404).json({
                success: false,
                message: 'Chat has been deleted'
            });
        }

        // Create new message
        const newMessage = {
            sender: userId,
            content,
            readBy: [userId], // Message is already read by sender
            deletedBy: [],
            createdAt: new Date()
        };

        // Add message to chat
        chat.messages.push(newMessage);
        
        // Update chat activity timestamp
        chat.lastActivity = new Date();
        
        // Reactivate chat if it was archived
        if (!chat.isActive) {
            chat.isActive = true;
        }
        
        // Remove this user from deletedBy if they had deleted the chat before
        chat.deletedBy = chat.deletedBy.filter(id => id.toString() !== userId.toString());

        await chat.save();

        // Return the newly added message
        const addedMessage = chat.messages[chat.messages.length - 1];

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            newMessage: addedMessage
        });
    } catch (err) {
        console.error('Send message error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while sending message'
        });
    }
};

// @route   DELETE /api/chats/:id/messages/:messageId
// @desc    Delete a message
// @access  Private
exports.deleteMessage = async (req, res) => {
    try {
        const chatId = req.params.id;
        const messageId = req.params.messageId;
        const userId = req.user._id;

        // Find the chat
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // Check authorization - user must be either the customer or chef
        if (chat.customer.toString() !== userId.toString() && 
            chat.chef.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this chat'
            });
        }

        // Find the message
        const messageIndex = chat.messages.findIndex(msg => 
            msg._id.toString() === messageId
        );

        if (messageIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Add user to message deletedBy array (this is a soft delete)
        if (!chat.messages[messageIndex].deletedBy.some(id => id.toString() === userId.toString())) {
            chat.messages[messageIndex].deletedBy.push(userId);
        }

        await chat.save();

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (err) {
        console.error('Delete message error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting message'
        });
    }
};

// @route   DELETE /api/chats/:id
// @desc    Delete a chat (mark as deleted for the user)
// @access  Private
exports.deleteChat = async (req, res) => {
    try {
        const chatId = req.params.id;
        const userId = req.user._id;

        // Find the chat
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // Check authorization - user must be either the customer or chef
        if (chat.customer.toString() !== userId.toString() && 
            chat.chef.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this chat'
            });
        }

        // Add user to deletedBy array if not already there
        if (!chat.deletedBy.some(id => id.toString() === userId.toString())) {
            chat.deletedBy.push(userId);
        }

        // If both customer and chef have deleted the chat, archive it
        if (chat.deletedBy.length >= 2) {
            chat.isActive = false;
        }

        await chat.save();

        res.json({
            success: true,
            message: 'Chat deleted successfully'
        });
    } catch (err) {
        console.error('Delete chat error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting chat'
        });
    }
};

// @route   PATCH /api/chats/:id/read
// @desc    Mark all messages as read
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        const chatId = req.params.id;
        const userId = req.user._id;

        // Find the chat
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        // Check authorization - user must be either the customer or chef
        if (chat.customer.toString() !== userId.toString() && 
            chat.chef.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this chat'
            });
        }

        // Mark all unread messages as read by this user
        let updated = false;
        chat.messages.forEach(message => {
            if (message.sender.toString() !== userId.toString() && 
                !message.readBy.some(id => id.toString() === userId.toString())) {
                message.readBy.push(userId);
                updated = true;
            }
        });

        if (updated) {
            await chat.save();
        }

        res.json({
            success: true,
            message: 'Messages marked as read'
        });
    } catch (err) {
        console.error('Mark messages as read error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while updating messages'
        });
    }
};
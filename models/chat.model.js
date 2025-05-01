// models/chat.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Message schema (embedded document)
const messageSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    readBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    deletedBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Chat conversation schema
const chatSchema = new Schema({
    // The order this chat is related to
    order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    // The customer who placed the order
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The chef who is fulfilling part of the order
    chef: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // All messages in the conversation
    messages: [messageSchema],
    // Track if chat is active or archived
    isActive: {
        type: Boolean,
        default: true
    },
    // Last activity timestamp
    lastActivity: {
        type: Date,
        default: Date.now
    },
    // Users who have deleted this chat
    deletedBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Ensure one chat per order per chef-customer pair
chatSchema.index({ order: 1, customer: 1, chef: 1 }, { unique: true });

module.exports = mongoose.model('Chat', chatSchema);
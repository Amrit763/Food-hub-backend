// controllers/orders.controller.js
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const CartItem = require('../models/cart.model');
const Chat = require('../models/chat.model');
const { validationResult } = require('express-validator');

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
exports.createOrder = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        // Get cart items for the user
        const cartItems = await CartItem.find({ user: req.user._id }).populate('product');
        
        if (cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty. Add items before placing an order.'
            });
        }
        
        console.log(`Creating order for user ${req.user._id} with ${cartItems.length} items in cart`);
        
        // Extract order data
        const {
            deliveryAddress,
            deliveryDate,
            deliveryTime,
            deliveryNotes,
            paymentMethod
        } = req.body;
        
        // Create order items array and organize by chef
        const orderItems = [];
        const chefItemsMap = new Map(); // Map to group items by chef
        let subtotal = 0;
        
        for (const cartItem of cartItems) {
            // Skip unavailable products
            if (!cartItem.product || !cartItem.product.isAvailable) {
                console.log(`Skipping unavailable product ${cartItem.product?._id || 'unknown'}`);
                continue;
            }
            
            // Get the chef ID
            const chefId = cartItem.product.chef.toString();
            
            // Calculate item subtotal with condiments
            let itemPrice = Number(cartItem.product.price) || 0;
            
            // Add condiment prices
            if (cartItem.selectedCondiments && cartItem.selectedCondiments.length > 0) {
                for (const condiment of cartItem.selectedCondiments) {
                    const condimentPrice = Number(condiment.price) || 0;
                    if (!isNaN(condimentPrice)) {
                        itemPrice += condimentPrice;
                    }
                }
            }
            
            const itemSubtotal = itemPrice * cartItem.quantity;
            subtotal += itemSubtotal;
            
            console.log(`Item: ${cartItem.product.name}, Base price: ${cartItem.product.price}, With condiments: ${itemPrice}, Quantity: ${cartItem.quantity}, Subtotal: ${itemSubtotal}`);
            
            // Create order item
            const orderItem = {
                product: cartItem.product._id,
                quantity: cartItem.quantity,
                price: cartItem.product.price,
                selectedCondiments: cartItem.selectedCondiments || [],
                subtotal: itemSubtotal
            };
            
            orderItems.push(orderItem);
            
            // Add to chef's items
            if (!chefItemsMap.has(chefId)) {
                chefItemsMap.set(chefId, {
                    chef: chefId,
                    items: [],
                    status: 'pending',
                    statusHistory: [{ status: 'pending' }]
                });
            }
            
            chefItemsMap.get(chefId).items.push(orderItem);
        }
        
        // Round subtotal to 2 decimal places
        subtotal = Math.round(subtotal * 100) / 100;
        console.log(`Order subtotal: ${subtotal}`);
        
        // Calculate service fee (10%)
        const serviceFee = Math.round(subtotal * 0.1 * 100) / 100;
        console.log(`Service fee: ${serviceFee}`);
        
        // Calculate total
        const totalAmount = Math.round((subtotal + serviceFee) * 100) / 100;
        console.log(`Order total: ${totalAmount}`);
        
        // Convert chef items map to array
        const chefItems = Array.from(chefItemsMap.values());
        
        // Create the order
        const newOrder = new Order({
            user: req.user._id,
            items: orderItems,
            chefItems,
            subtotal,
            serviceFee,
            totalAmount,
            deliveryAddress,
            deliveryDate,
            deliveryTime,
            deliveryNotes: deliveryNotes || '',
            paymentMethod,
            paymentStatus: 'paid', // For now, assume all orders are paid
            status: 'pending',
            statusHistory: [{ status: 'pending' }]
        });
        
        // Save the order
        const savedOrder = await newOrder.save();
        
        // Create chat channels for each chef in the order
        const createChatsForOrder = async (orderId, userId, chefIds) => {
            try {
                const chatPromises = chefIds.map(chefId => {
                    return Chat.create({
                        order: orderId,
                        customer: userId,
                        chef: chefId,
                        messages: []
                    });
                });
                
                await Promise.all(chatPromises);
                console.log(`Created ${chefIds.length} chat channels for order ${orderId}`);
            } catch (error) {
                console.error('Error creating chat channels:', error);
                // We don't want to fail the order creation if chat creation fails
                // Just log the error
            }
        };
        
        // Get unique chef IDs from the order
        const chefIds = [...new Set(chefItems.map(item => item.chef.toString()))];
        
        // Create chat channels
        await createChatsForOrder(savedOrder._id, req.user._id, chefIds);
        
        // Clear the user's cart
        await CartItem.deleteMany({ user: req.user._id });
        
        // Populate chef details
        const populatedOrder = await Order.findById(savedOrder._id)
            .populate({
                path: 'user',
                select: 'fullName email profileImage'
            })
            .populate({
                path: 'items.product',
                select: 'name price images description chef category'
            })
            .populate({
                path: 'chefItems.chef',
                select: 'fullName email profileImage'
            });
        
        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order: populatedOrder
        });
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while creating order'
        });
    }
};

// @route   GET /api/orders/user
// @desc    Get all orders for current user
// @access  Private
exports.getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id, deleted: { $ne: true } })
            .populate({
                path: 'user',
                select: 'fullName email profileImage'
            })
            .populate({
                path: 'items.product',
                select: 'name price images description chef category',
                populate: {
                    path: 'chef',
                    select: 'fullName profileImage'
                }
            })
            .populate({
                path: 'chefItems.chef',
                select: 'fullName profileImage'
            })
            .sort('-createdAt');

        // Add a flag to identify if the user can review each item
        const ordersWithReviewFlag = orders.map(order => {
            const orderObj = order.toObject();
            
            // Can only review items in delivered orders
            const canReview = order.status === 'delivered';
            
            // Add canReview flag to each item
            orderObj.items = orderObj.items.map(item => ({
                ...item,
                canReview
            }));
            
            return orderObj;
        });

        res.json({
            success: true,
            count: orders.length,
            orders: ordersWithReviewFlag
        });
    } catch (err) {
        console.error('Get user orders error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching orders'
        });
    }
};

// @route   GET /api/orders/chef
// @desc    Get all orders for a chef
// @access  Private (Chef only)
exports.getChefOrders = async (req, res) => {
    try {
        const chefId = req.user._id;
        
        // Status filter if provided
        const statusFilter = req.query.status ? { 'chefItems.status': req.query.status } : {};
        
        // Exclude deleted orders
        const deletedFilter = { deleted: { $ne: true } };
        
        // Find orders that have items with products created by this chef
        const orders = await Order.find({
            'chefItems.chef': chefId,
            ...statusFilter,
            ...deletedFilter
        })
        .populate({
            path: 'user',
            select: 'fullName email profileImage'
        })
        .populate({
            path: 'items.product',
            select: 'name price images description chef category',
            populate: {
                path: 'chef',
                select: 'fullName profileImage'
            }
        })
        .populate({
            path: 'chefItems.chef',
            select: 'fullName profileImage'
        })
        .sort('-createdAt');

        res.json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (err) {
        console.error('Get chef orders error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching orders'
        });
    }
};

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate({
                path: 'user',
                select: 'fullName email profileImage'
            })
            .populate({
                path: 'items.product',
                select: 'name price images description chef category',
                populate: {
                    path: 'chef',
                    select: 'fullName profileImage'
                }
            })
            .populate({
                path: 'chefItems.chef',
                select: 'fullName profileImage'
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if the user is authorized to view this order
        if (order.user._id.toString() !== req.user._id.toString() && 
            req.user.role !== 'admin') {
            
            // If user is a chef, verify they have items in this order
            if (req.user.role === 'chef') {
                const chefId = req.user._id.toString();
                const hasChefItems = order.chefItems.some(item => 
                    item.chef._id.toString() === chefId
                );

                if (!hasChefItems) {
                    return res.status(403).json({
                        success: false,
                        message: 'Not authorized to view this order'
                    });
                }
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this order'
                });
            }
        }

        // Add review flag for each item
        const orderObj = order.toObject();
        
        // Can only review items in delivered orders
        const canReview = order.status === 'delivered' && 
                          order.user._id.toString() === req.user._id.toString();
        
        // Add canReview flag to each item
        orderObj.items = orderObj.items.map(item => ({
            ...item,
            canReview
        }));

        res.json({
            success: true,
            order: orderObj
        });
    } catch (err) {
        console.error('Get order by ID error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @route   PATCH /api/orders/:id/status
// @desc    Update order status for a chef's items
// @access  Private (Chef or Admin)
exports.updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    
    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'Status is required'
        });
    }

    // Validate status value
    const validStatuses = ['pending', 'received', 'in_progress', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status value'
        });
    }

    try {
        const order = await Order.findById(req.params.id)
            .populate({
                path: 'user',
                select: 'fullName email profileImage'
            })
            .populate({
                path: 'items.product',
                select: 'name price images description chef category',
                populate: {
                    path: 'chef',
                    select: 'fullName profileImage'
                }
            })
            .populate({
                path: 'chefItems.chef',
                select: 'fullName profileImage'
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check authorization (chef or admin)
        if (req.user.role !== 'admin' && req.user.role !== 'chef') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update order status'
            });
        }

        if (req.user.role === 'chef') {
            const chefId = req.user._id.toString();
            
            // Find the chef's items in the order
            const chefItemIndex = order.chefItems.findIndex(item => 
                item.chef._id.toString() === chefId
            );

            if (chefItemIndex === -1) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this order'
                });
            }

            // Update status for this chef's items only
            order.chefItems[chefItemIndex].status = status;
            order.chefItems[chefItemIndex].statusHistory.push({
                status,
                timestamp: new Date()
            });

            // Update overall order status based on chef items statuses
            updateOverallOrderStatus(order);
        } else if (req.user.role === 'admin') {
            // Admins can update the entire order status
            order.status = status;
            order.statusHistory.push({
                status,
                timestamp: new Date()
            });
            
            // Update all chef items to match
            order.chefItems.forEach(chefItem => {
                chefItem.status = status;
                chefItem.statusHistory.push({
                    status,
                    timestamp: new Date()
                });
            });
        }

        await order.save();

        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            order
        });
    } catch (err) {
        console.error('Update order status error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Helper function to determine overall order status
function updateOverallOrderStatus(order) {
    // If any chef has cancelled, the order stays as cancelled
    if (order.status === 'cancelled') {
        return;
    }
    
    // If all chefs have delivered, mark the order as delivered
    if (order.chefItems.every(item => item.status === 'delivered')) {
        order.status = 'delivered';
        order.statusHistory.push({
            status: 'delivered',
            timestamp: new Date()
        });
        return;
    }
    
    // If all chefs have at least marked as ready, mark the order as ready
    if (order.chefItems.every(item => 
        ['ready', 'delivered'].includes(item.status)
    )) {
        order.status = 'ready';
        order.statusHistory.push({
            status: 'ready',
            timestamp: new Date()
        });
        return;
    }
    
    // If any chef has started preparing, mark as in_progress
    if (order.chefItems.some(item => 
        ['in_progress', 'ready', 'delivered'].includes(item.status)
    )) {
        order.status = 'in_progress';
        order.statusHistory.push({
            status: 'in_progress',
            timestamp: new Date()
        });
        return;
    }
    
    // If all chefs have at least received the order, mark as received
    if (order.chefItems.every(item => 
        item.status !== 'pending'
    )) {
        order.status = 'received';
        order.statusHistory.push({
            status: 'received',
            timestamp: new Date()
        });
        return;
    }
}

// @route   PATCH /api/orders/:id/cancel
// @desc    Cancel an order
// @access  Private
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate({
                path: 'user',
                select: 'fullName email profileImage'
            })
            .populate({
                path: 'items.product',
                select: 'name price images description chef category',
                populate: {
                    path: 'chef',
                    select: 'fullName profileImage'
                }
            })
            .populate({
                path: 'chefItems.chef',
                select: 'fullName profileImage'
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check authorization
        const isOrderOwner = order.user._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        let isChefWithItems = false;
        
        if (req.user.role === 'chef') {
            const chefId = req.user._id.toString();
            isChefWithItems = order.chefItems.some(item => 
                item.chef._id.toString() === chefId
            );
        }
        
        if (!isOrderOwner && !isAdmin && !isChefWithItems) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to modify this order'
            });
        }

        // Check if we're getting a "delete" action in the request body
        const isDelete = req.body.action === 'delete';
        
        // If it's a delete request or the order is already delivered/cancelled, mark as deleted
        if (isDelete || order.status === 'delivered' || order.status === 'cancelled') {
            // Add a "deleted" flag to the order
            order.deleted = true;
            order.deletedAt = new Date();
            
            await order.save();
            
            return res.json({
                success: true,
                message: 'Order removed from view',
                order
            });
        }

        // Otherwise, if it's a normal cancel and order is active, check it can be cancelled
        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel order - it has already been processed'
            });
        }

        // Update status to cancelled
        order.status = 'cancelled';
        order.statusHistory.push({
            status: 'cancelled',
            timestamp: new Date()
        });
        
        // Update all chef items to cancelled
        order.chefItems.forEach(chefItem => {
            chefItem.status = 'cancelled';
            chefItem.statusHistory.push({
                status: 'cancelled',
                timestamp: new Date()
            });
        });

        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully',
            order
        });
    } catch (err) {
        console.error('Cancel/delete order error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @route   DELETE /api/orders/:id
// @desc    Delete an order permanently
// @access  Private (Admin only)
exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check authorization (admin only for permanent deletion)
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to permanently delete this order'
            });
        }

        // Use findByIdAndDelete for more reliable deletion
        const deletedOrder = await Order.findByIdAndDelete(req.params.id);
        
        if (!deletedOrder) {
            return res.status(404).json({
                success: false,
                message: 'Failed to delete order'
            });
        }

        res.json({
            success: true,
            message: 'Order permanently deleted'
        });
    } catch (err) {
        console.error('Delete order error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @route   GET /api/orders/:id/can-review/:productId
// @desc    Check if a product can be reviewed by current user
// @access  Private
exports.canReviewProduct = async (req, res) => {
    try {
        const orderId = req.params.id;
        const productId = req.params.productId;
        const userId = req.user._id;
        
        // Find the order
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Check if user is the order owner
        if (order.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to review this order'
            });
        }
        
        // Check if order is delivered
        if (order.status !== 'delivered') {
            return res.json({
                success: true,
                canReview: false,
                reason: 'Order is not delivered yet'
            });
        }
        
        // Check if the product was part of this order
        const productInOrder = order.items.some(item => 
            item.product.toString() === productId
        );
        
        if (!productInOrder) {
            return res.json({
                success: true,
                canReview: false,
                reason: 'Product was not part of this order'
            });
        }
        
        // Check if product was already reviewed in this order
        const alreadyReviewed = order.reviewedItems.some(item => 
            item.product.toString() === productId
        );
        
        if (alreadyReviewed) {
            return res.json({
                success: true,
                canReview: false,
                reason: 'Product was already reviewed for this order'
            });
        }
        
        // All checks passed, user can review this product
        return res.json({
            success: true,
            canReview: true
        });
    } catch (err) {
        console.error('Can review product check error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Order or product not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error while checking review eligibility'
        });
    }
};
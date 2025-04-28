// controllers/orders.controller.js
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const CartItem = require('../models/cart.model');
const { validationResult } = require('express-validator');

// @route   POST /api/orders
// @desc    Create a new order from cart
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
        const user = req.user._id;
        const { 
            deliveryAddress, 
            deliveryDate, 
            deliveryTime, 
            deliveryNotes, 
            paymentMethod 
        } = req.body;

        // Get items from user's cart
        const cartItems = await CartItem.find({ user })
            .populate({
                path: 'product',
                select: 'name price images chef isAvailable'
            });

        if (cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        // Calculate order totals
        let subtotal = 0;
        const orderItems = [];
        
        // Group items by chef for easier management
        const chefItemsMap = {};

        for (const item of cartItems) {
            // Verify product is available
            if (!item.product.isAvailable) {
                return res.status(400).json({
                    success: false,
                    message: `${item.product.name} is no longer available`
                });
            }

            // Calculate item total
            const itemTotal = item.product.price * item.quantity;
            subtotal += itemTotal;

            // Create order item
            const orderItem = {
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.price,
                subtotal: itemTotal
            };
            
            orderItems.push(orderItem);

            // Group by chef with status tracking
            const chefId = item.product.chef.toString();
            if (!chefItemsMap[chefId]) {
                chefItemsMap[chefId] = {
                    chef: chefId,
                    items: [],
                    status: 'pending',
                    statusHistory: [{ status: 'pending', timestamp: new Date() }]
                };
            }
            chefItemsMap[chefId].items.push(orderItem);
        }

        // Convert chef items map to array
        const chefItems = Object.values(chefItemsMap);

        // Apply service fee (10%)
        const serviceFee = Math.round(subtotal * 0.1 * 100) / 100;
        const totalAmount = Math.round((subtotal + serviceFee) * 100) / 100;

        // Create the order
        const newOrder = new Order({
            user,
            items: orderItems,
            chefItems,
            totalAmount,
            subtotal,
            serviceFee,
            deliveryAddress,
            deliveryDate,
            deliveryTime,
            deliveryNotes,
            paymentMethod,
            paymentStatus: 'paid', // For demo purposes, set as paid
            status: 'pending',
            statusHistory: [{ status: 'pending', timestamp: new Date() }]
        });

        const savedOrder = await newOrder.save();
        
        // Clear the user's cart
        await CartItem.deleteMany({ user });

        // Return the populated order
        const populatedOrder = await Order.findById(savedOrder._id)
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

        res.status(201).json({
            success: true,
            order: populatedOrder
        });
    } catch (err) {
        console.error('Create order error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during order creation'
        });
    }
};

// @route   GET /api/orders/user
// @desc    Get all orders for current user
// @access  Private
exports.getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
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
        
        // Find orders that have items with products created by this chef
        const orders = await Order.find({
            'chefItems.chef': chefId,
            ...statusFilter
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

        res.json({
            success: true,
            order
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

// Replace the cancelOrder method in orders.controller.js with this modified version

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
// @desc    Delete an order
// @access  Private
// @route   DELETE /api/orders/:id
// @desc    Delete an order permanently
// @access  Private
exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check authorization (admin or order owner or chef with items in the order)
        if (req.user.role !== 'admin' && 
            order.user.toString() !== req.user._id.toString()) {
            
            // If user is a chef, check if they have items in this order
            if (req.user.role === 'chef') {
                const chefId = req.user._id.toString();
                const hasChefItems = order.chefItems.some(item => 
                    item.chef.toString() === chefId
                );

                if (!hasChefItems) {
                    return res.status(403).json({
                        success: false,
                        message: 'Not authorized to delete this order'
                    });
                }
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this order'
                });
            }
        }

        // Only allow deletion of delivered or cancelled orders
        if (order.status !== 'delivered' && order.status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Only delivered or cancelled orders can be deleted'
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
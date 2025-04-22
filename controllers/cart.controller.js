const CartItem = require('../models/cart.model');
const Product = require('../models/product.model');
const { validationResult } = require('express-validator');

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
exports.getCart = async (req, res) => {
    try {
        console.log(`Fetching cart for user: ${req.user._id}`);
        
        // Find all cart items for the user and populate product details
        const cartItems = await CartItem.find({ user: req.user._id })
            .populate({
                path: 'product',
                select: 'name price images description chef isAvailable category tags',
                populate: {
                    path: 'chef',
                    select: 'fullName profileImage'
                }
            })
            .sort('-createdAt');
            
        console.log(`Found ${cartItems.length} items in cart`);

        // Calculate cart totals
        let subtotal = 0;
        const validItems = [];
        
        cartItems.forEach(item => {
            // Only count available products
            if (item.product && item.product.isAvailable) {
                subtotal += item.product.price * item.quantity;
                validItems.push(item);
            } else if (item.product) {
                // Product exists but is unavailable
                console.log(`Product ${item.product._id} in cart is unavailable`);
            } else {
                // Product was deleted
                console.log(`Product in cart item ${item._id} no longer exists`);
            }
        });

        // Round to 2 decimal places
        subtotal = Math.round(subtotal * 100) / 100;
        
        // Apply service fee (10%)
        const serviceFee = Math.round(subtotal * 0.1 * 100) / 100;
        
        // Calculate total
        const total = Math.round((subtotal + serviceFee) * 100) / 100;

        res.json({
            success: true,
            count: validItems.length,
            items: validItems,
            subtotal,
            serviceFee,
            total
        });
    } catch (err) {
        console.error('Get cart error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching cart'
        });
    }
};

// @route   POST /api/cart
// @desc    Add item to cart
// @access  Private
exports.addToCart = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        const { productId, quantity = 1 } = req.body;
        
        console.log(`Adding product ${productId} to cart for user ${req.user._id} with quantity ${quantity}`);

        // Verify product exists and is available
        const product = await Product.findById(productId);
        
        if (!product) {
            console.log(`Product ${productId} not found`);
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (!product.isAvailable) {
            console.log(`Product ${productId} is unavailable`);
            return res.status(400).json({
                success: false,
                message: 'This product is currently unavailable'
            });
        }

        // Check if product is already in cart
        let cartItem = await CartItem.findOne({ 
            user: req.user._id,
            product: productId
        });

        if (cartItem) {
            console.log(`Product ${productId} already in cart, updating quantity from ${cartItem.quantity} to ${cartItem.quantity + parseInt(quantity)}`);
            // Update quantity if already in cart
            cartItem.quantity += parseInt(quantity);
            await cartItem.save();
        } else {
            console.log(`Adding new cart item for product ${productId}`);
            // Add new item to cart
            cartItem = new CartItem({
                user: req.user._id,
                product: productId,
                quantity: parseInt(quantity)
            });
            await cartItem.save();
        }

        // Return updated cart
        return await getUpdatedCart(req, res);
    } catch (err) {
        console.error('Add to cart error:', err.message);
        
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'This product is already in your cart'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error while adding to cart'
        });
    }
};

// @route   PUT /api/cart/:id
// @desc    Update cart item quantity
// @access  Private
exports.updateCartItem = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        const { quantity } = req.body;
        
        console.log(`Updating cart item ${req.params.id} with quantity ${quantity}`);
        
        // Validate quantity
        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1'
            });
        }

        // Find cart item
        const cartItem = await CartItem.findOne({ 
            _id: req.params.id,
            user: req.user._id
        });

        if (!cartItem) {
            console.log(`Cart item ${req.params.id} not found for user ${req.user._id}`);
            return res.status(404).json({
                success: false,
                message: 'Cart item not found'
            });
        }

        // Update quantity
        cartItem.quantity = parseInt(quantity);
        await cartItem.save();
        
        console.log(`Cart item ${req.params.id} updated successfully`);

        // Return updated cart
        return await getUpdatedCart(req, res);
    } catch (err) {
        console.error('Update cart item error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while updating cart'
        });
    }
};

// @route   DELETE /api/cart/:id
// @desc    Remove item from cart
// @access  Private
exports.removeFromCart = async (req, res) => {
    try {
        console.log(`Removing cart item ${req.params.id} for user ${req.user._id}`);
        
        // Find and remove cart item
        const result = await CartItem.findOneAndDelete({ 
            _id: req.params.id,
            user: req.user._id
        });

        if (!result) {
            console.log(`Cart item ${req.params.id} not found for user ${req.user._id}`);
            return res.status(404).json({
                success: false,
                message: 'Cart item not found'
            });
        }
        
        console.log(`Cart item ${req.params.id} removed successfully`);

        // Return updated cart
        return await getUpdatedCart(req, res);
    } catch (err) {
        console.error('Remove from cart error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while removing from cart'
        });
    }
};

// @route   DELETE /api/cart
// @desc    Clear the entire cart
// @access  Private
exports.clearCart = async (req, res) => {
    try {
        console.log(`Clearing entire cart for user ${req.user._id}`);
        
        // Delete all cart items for this user
        const result = await CartItem.deleteMany({ user: req.user._id });
        
        console.log(`Cleared ${result.deletedCount} items from cart`);

        res.json({
            success: true,
            message: 'Cart cleared successfully',
            items: [],
            count: 0,
            subtotal: 0,
            serviceFee: 0,
            total: 0
        });
    } catch (err) {
        console.error('Clear cart error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while clearing cart'
        });
    }
};

// Helper function to return the updated cart
async function getUpdatedCart(req, res) {
    // Find all cart items for the user
    const cartItems = await CartItem.find({ user: req.user._id })
        .populate({
            path: 'product',
            select: 'name price images description chef isAvailable category tags',
            populate: {
                path: 'chef',
                select: 'fullName profileImage'
            }
        })
        .sort('-createdAt');

    // Calculate cart totals
    let subtotal = 0;
    const validItems = [];
    
    cartItems.forEach(item => {
        if (item.product && item.product.isAvailable) {
            subtotal += item.product.price * item.quantity;
            validItems.push(item);
        }
    });
    
    // Round to 2 decimal places
    subtotal = Math.round(subtotal * 100) / 100;
    
    // Apply service fee (10%)
    const serviceFee = Math.round(subtotal * 0.1 * 100) / 100;
    
    // Calculate total
    const total = Math.round((subtotal + serviceFee) * 100) / 100;

    return res.json({
        success: true,
        count: validItems.length,
        items: validItems,
        subtotal,
        serviceFee,
        total
    });
}
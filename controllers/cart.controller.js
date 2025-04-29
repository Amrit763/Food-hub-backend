const CartItem = require('../models/cart.model');
const Product = require('../models/product.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

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
                select: 'name price images description chef isAvailable category tags condiments',
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
        
        for (let item of cartItems) {
            // Only count available products
            if (item.product && item.product.isAvailable) {
                // If totalPrice is not already calculated, calculate it now
                if (item.totalPrice === 0 || item.totalPrice === undefined) {
                    console.log(`Recalculating totalPrice for item ${item._id}`);
                    
                    // Get base product price
                    const basePrice = Number(item.product.price);
                    if (isNaN(basePrice)) {
                        console.warn(`Product has invalid price: ${item.product.price}`);
                        continue; // Skip this item
                    }
                    
                    // Calculate condiments price
                    let condimentsPrice = 0;
                    if (item.selectedCondiments && item.selectedCondiments.length > 0) {
                        for (const condiment of item.selectedCondiments) {
                            const condimentPrice = Number(condiment.price);
                            if (!isNaN(condimentPrice)) {
                                condimentsPrice += condimentPrice;
                            }
                        }
                    }
                    
                    // Calculate item total
                    const itemPrice = basePrice + condimentsPrice;
                    const itemTotal = itemPrice * item.quantity;
                    
                    // Update total price in database
                    console.log(`Setting item totalPrice to ${itemTotal}`);
                    item.totalPrice = itemTotal;
                    await item.save();
                }
                
                // Add to subtotal
                subtotal += Number(item.totalPrice);
                validItems.push(item);
                
                console.log(`Item: ${item.product.name}, Price: ${item.product.price}, Quantity: ${item.quantity}, Total: ${item.totalPrice}`);
            } else if (item.product) {
                // Product exists but is unavailable
                console.log(`Product ${item.product._id} in cart is unavailable`);
            } else {
                // Product was deleted
                console.log(`Product in cart item ${item._id} no longer exists`);
            }
        }

        // Round to 2 decimal places
        subtotal = Math.round(subtotal * 100) / 100;
        console.log(`Cart subtotal: ${subtotal}`);
        
        // Apply service fee (10%)
        const serviceFee = Math.round(subtotal * 0.1 * 100) / 100;
        console.log(`Service fee: ${serviceFee}`);
        
        // Calculate total
        const total = Math.round((subtotal + serviceFee) * 100) / 100;
        console.log(`Cart total: ${total}`);

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
        const { productId, quantity = 1, selectedCondiments = [] } = req.body;
        
        console.log(`Adding product ${productId} to cart for user ${req.user._id} with quantity ${quantity}`);
        console.log('Selected condiments:', JSON.stringify(selectedCondiments));

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
        
        // Get base product price
        const basePrice = Number(product.price);
        if (isNaN(basePrice)) {
            console.error(`Product ${productId} has invalid price: ${product.price}`);
            return res.status(400).json({
                success: false,
                message: 'Product has an invalid price'
            });
        }
        console.log(`Base product price: ${basePrice}`);
        
        // Validate selected condiments
        const validatedCondiments = [];
        let condimentsPrice = 0;
        
        if (selectedCondiments && selectedCondiments.length > 0) {
            console.log(`Processing ${selectedCondiments.length} condiments`);
            
            // Verify each selected condiment exists in the product
            for (const selectedCondiment of selectedCondiments) {
                if (!selectedCondiment.condimentId) {
                    console.log(`Skipping condiment with missing ID`);
                    continue;
                }
                
                const condimentId = selectedCondiment.condimentId.toString();
                console.log(`Looking for condiment with ID: ${condimentId}`);
                
                // Find the matching condiment in the product
                const productCondiment = product.condiments.find(
                    c => c._id.toString() === condimentId
                );
                
                if (!productCondiment) {
                    console.log(`Condiment with ID ${condimentId} not found in product`);
                    return res.status(400).json({
                        success: false,
                        message: `Condiment with ID ${condimentId} does not exist for this product`
                    });
                }
                
                // Get valid price
                const condimentPrice = Number(productCondiment.price);
                if (isNaN(condimentPrice)) {
                    console.warn(`Condiment ${productCondiment.name} has invalid price: ${productCondiment.price}`);
                    continue;
                }
                
                condimentsPrice += condimentPrice;
                console.log(`Added condiment ${productCondiment.name} with price ${condimentPrice}`);
                
                // Add the validated condiment
                validatedCondiments.push({
                    condimentId: productCondiment._id,
                    name: productCondiment.name,
                    price: condimentPrice
                });
            }
        }
        
        console.log(`Total condiments price: ${condimentsPrice}`);
        
        // Calculate item price
        const itemPrice = basePrice + condimentsPrice;
        const totalPrice = itemPrice * parseInt(quantity);
        console.log(`Item price with condiments: ${itemPrice}, total with quantity: ${totalPrice}`);

        // Check if product is already in cart
        let cartItem = await CartItem.findOne({ 
            user: req.user._id,
            product: productId
        });

        if (cartItem) {
            console.log(`Product ${productId} already in cart, updating quantity from ${cartItem.quantity} to ${cartItem.quantity + parseInt(quantity)}`);
            // Update quantity if already in cart
            cartItem.quantity += parseInt(quantity);
            
            // Replace condiments if provided
            if (selectedCondiments && selectedCondiments.length > 0) {
                cartItem.selectedCondiments = validatedCondiments;
            }
            
            // Set total price explicitly
            cartItem.totalPrice = totalPrice;
            console.log(`Set cart item totalPrice to ${totalPrice}`);
            
            await cartItem.save();
        } else {
            console.log(`Adding new cart item for product ${productId}`);
            // Add new item to cart
            cartItem = new CartItem({
                user: req.user._id,
                product: productId,
                quantity: parseInt(quantity),
                selectedCondiments: validatedCondiments,
                totalPrice: totalPrice
            });
            
            console.log(`Created new cart item with totalPrice: ${totalPrice}`);
            await cartItem.save();
        }

        // Return updated cart
        return await getUpdatedCart(req, res);
    } catch (err) {
        console.error('Add to cart error:', err.message);
        console.error(err.stack);
        
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
// @desc    Update cart item quantity and/or condiments
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
        const { quantity, selectedCondiments } = req.body;
        
        console.log(`Updating cart item ${req.params.id}`);
        
        // Validate quantity if provided
        if (quantity && quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1'
            });
        }

        // Find cart item
        let cartItem = await CartItem.findOne({ 
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
        
        // Load the product to validate condiments
        await cartItem.populate('product');
        const product = cartItem.product;
        
        // Update quantity if provided
        if (quantity) {
            cartItem.quantity = parseInt(quantity);
        }
        
        // Update condiments if provided
        if (selectedCondiments) {
            const validatedCondiments = [];
            
            // Verify each selected condiment exists in the product
            for (const selectedCondiment of selectedCondiments) {
                const condimentExists = product.condiments.some(
                    c => c._id.toString() === selectedCondiment.condimentId
                );
                
                if (!condimentExists) {
                    return res.status(400).json({
                        success: false,
                        message: `Condiment with ID ${selectedCondiment.condimentId} does not exist for this product`
                    });
                }
                
                // Find the actual condiment from the product
                const productCondiment = product.condiments.find(
                    c => c._id.toString() === selectedCondiment.condimentId
                );
                
                // Add the validated condiment
                validatedCondiments.push({
                    condimentId: productCondiment._id,
                    name: productCondiment.name,
                    price: productCondiment.price
                });
            }
            
            // Update condiments
            cartItem.selectedCondiments = validatedCondiments;
        }
        
        // Recalculate total price
        cartItem.totalPrice = cartItem.calculateTotalPrice(product.price);
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

// @route   PUT /api/cart/:id/condiments
// @desc    Update only cart item condiments
// @access  Private
exports.updateCartItemCondiments = async (req, res) => {
    try {
        const { selectedCondiments } = req.body;
        
        if (!selectedCondiments) {
            return res.status(400).json({
                success: false,
                message: 'Selected condiments are required'
            });
        }
        
        console.log(`Updating condiments for cart item ${req.params.id}`);
        
        // Find cart item
        let cartItem = await CartItem.findOne({ 
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
        
        // Load the product to validate condiments
        await cartItem.populate('product');
        const product = cartItem.product;
        
        const validatedCondiments = [];
        
        // Verify each selected condiment exists in the product
        for (const selectedCondiment of selectedCondiments) {
            const condimentExists = product.condiments.some(
                c => c._id.toString() === selectedCondiment.condimentId
            );
            
            if (!condimentExists) {
                return res.status(400).json({
                    success: false,
                    message: `Condiment with ID ${selectedCondiment.condimentId} does not exist for this product`
                });
            }
            
            // Find the actual condiment from the product
            const productCondiment = product.condiments.find(
                c => c._id.toString() === selectedCondiment.condimentId
            );
            
            // Add the validated condiment
            validatedCondiments.push({
                condimentId: productCondiment._id,
                name: productCondiment.name,
                price: productCondiment.price
            });
        }
        
        // Update condiments
        cartItem.selectedCondiments = validatedCondiments;
        
        // Recalculate total price
        cartItem.totalPrice = cartItem.calculateTotalPrice(product.price);
        await cartItem.save();
        
        console.log(`Cart item ${req.params.id} condiments updated successfully`);

        // Return updated cart
        return await getUpdatedCart(req, res);
    } catch (err) {
        console.error('Update cart item condiments error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while updating cart condiments'
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
    try {
        console.log('Getting updated cart');
        
        // Find all cart items for the user
        const cartItems = await CartItem.find({ user: req.user._id })
            .populate({
                path: 'product',
                select: 'name price images description chef isAvailable category tags condiments',
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
        
        for (let item of cartItems) {
            // Only count available products
            if (item.product && item.product.isAvailable) {
                // Ensure we have a valid total price
                if (item.totalPrice === 0 || item.totalPrice === undefined || isNaN(item.totalPrice)) {
                    console.log(`Recalculating price for item ${item._id} (${item.product.name})`);
                    
                    // Get base product price
                    const basePrice = Number(item.product.price);
                    if (isNaN(basePrice)) {
                        console.warn(`Product has invalid price: ${item.product.price}`);
                        continue; // Skip this item
                    }
                    
                    // Calculate condiments price
                    let condimentsPrice = 0;
                    if (item.selectedCondiments && item.selectedCondiments.length > 0) {
                        for (const condiment of item.selectedCondiments) {
                            const condimentPrice = Number(condiment.price);
                            if (!isNaN(condimentPrice)) {
                                condimentsPrice += condimentPrice;
                            }
                        }
                    }
                    
                    // Calculate item total
                    const itemPrice = basePrice + condimentsPrice;
                    const itemTotal = itemPrice * item.quantity;
                    
                    // Update total price in database
                    console.log(`Setting item totalPrice to ${itemTotal}`);
                    item.totalPrice = itemTotal;
                    await item.save();
                }
                
                console.log(`Item: ${item.product.name}, Base price: ${item.product.price}, Total price: ${item.totalPrice}`);
                
                // Add to subtotal
                subtotal += Number(item.totalPrice);
                validItems.push(item);
            }
        }
        
        // Round to 2 decimal places
        subtotal = Math.round(subtotal * 100) / 100;
        console.log(`Cart subtotal: ${subtotal}`);
        
        // Apply service fee (10%)
        const serviceFee = Math.round(subtotal * 0.1 * 100) / 100;
        console.log(`Service fee: ${serviceFee}`);
        
        // Calculate total
        const total = Math.round((subtotal + serviceFee) * 100) / 100;
        console.log(`Cart total: ${total}`);

        return res.json({
            success: true,
            count: validItems.length,
            items: validItems,
            subtotal,
            serviceFee,
            total
        });
    } catch (error) {
        console.error('Error in getUpdatedCart:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching updated cart'
        });
    }
}
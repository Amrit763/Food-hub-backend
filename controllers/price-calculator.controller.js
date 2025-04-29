// controllers/price-calculator.controller.js
const Product = require('../models/product.model');
const { validationResult } = require('express-validator');

/**
 * Calculate price for a product with selected condiments
 * 
 * @route   POST /api/calculate-price
 * @desc    Calculate the price of a product with selected condiments
 * @access  Public
 */
exports.calculatePrice = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        const { productId, quantity = 1, selectedCondiments = [] } = req.body;
        
        console.log(`Calculating price for product ${productId} with quantity ${quantity}`);
        console.log('Selected condiments:', selectedCondiments);

        // Verify product exists
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get base product price as a valid number
        const basePrice = Number(product.price);
        if (isNaN(basePrice)) {
            return res.status(400).json({
                success: false,
                message: 'Product has an invalid price'
            });
        }
        
        // Validate and calculate condiments price
        let condimentsPrice = 0;
        const validatedCondiments = [];
        
        if (selectedCondiments && selectedCondiments.length > 0) {
            for (const selectedCondiment of selectedCondiments) {
                // Get the condiment ID as string
                if (!selectedCondiment.condimentId) {
                    continue;
                }
                
                const condimentId = selectedCondiment.condimentId.toString();
                
                // Find the actual condiment in the product
                const productCondiment = product.condiments.find(
                    c => c._id.toString() === condimentId
                );
                
                if (!productCondiment) {
                    return res.status(400).json({
                        success: false,
                        message: `Condiment with ID ${condimentId} does not exist for this product`
                    });
                }
                
                // Get the condiment price as a valid number
                const condimentPrice = Number(productCondiment.price);
                if (!isNaN(condimentPrice)) {
                    condimentsPrice += condimentPrice;
                    
                    // Add validated condiment
                    validatedCondiments.push({
                        condimentId: productCondiment._id,
                        name: productCondiment.name,
                        price: condimentPrice
                    });
                }
            }
        }
        
        // Calculate total price
        const itemPrice = basePrice + condimentsPrice;
        const totalPrice = Math.round((itemPrice * quantity) * 100) / 100;
        
        console.log(`Result: Base price: ${basePrice}, Condiments: ${condimentsPrice}, Item price: ${itemPrice}, Total: ${totalPrice}`);
        
        // Return the calculated price details
        return res.json({
            success: true,
            calculation: {
                basePrice,
                condimentsPrice,
                itemPrice,
                quantity,
                totalPrice
            },
            validatedCondiments
        });
    } catch (err) {
        console.error('Calculate price error:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error while calculating price'
        });
    }
};

/**
 * Calculate cart totals
 * 
 * @route   POST /api/calculate-cart
 * @desc    Calculate the totals for cart items
 * @access  Public
 */
exports.calculateCart = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        const { items } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Items array is required and cannot be empty'
            });
        }
        
        console.log(`Calculating totals for ${items.length} cart items`);
        
        // Process each item
        const processedItems = [];
        let subtotal = 0;
        
        for (const item of items) {
            const { productId, quantity = 1, selectedCondiments = [] } = item;
            
            // Verify product exists
            const product = await Product.findById(productId);
            if (!product) {
                console.warn(`Product ${productId} not found, skipping`);
                continue;
            }
            
            // Get base product price
            const basePrice = Number(product.price);
            if (isNaN(basePrice)) {
                console.warn(`Product ${productId} has invalid price, skipping`);
                continue;
            }
            
            // Calculate condiments price
            let condimentsPrice = 0;
            const validatedCondiments = [];
            
            if (selectedCondiments && selectedCondiments.length > 0) {
                for (const selectedCondiment of selectedCondiments) {
                    if (!selectedCondiment.condimentId) continue;
                    
                    const condimentId = selectedCondiment.condimentId.toString();
                    const productCondiment = product.condiments.find(
                        c => c._id.toString() === condimentId
                    );
                    
                    if (productCondiment) {
                        const condimentPrice = Number(productCondiment.price);
                        if (!isNaN(condimentPrice)) {
                            condimentsPrice += condimentPrice;
                            validatedCondiments.push({
                                condimentId: productCondiment._id,
                                name: productCondiment.name,
                                price: condimentPrice
                            });
                        }
                    }
                }
            }
            
            // Calculate item total
            const itemPrice = basePrice + condimentsPrice;
            const itemTotal = Math.round((itemPrice * quantity) * 100) / 100;
            
            // Add to the subtotal
            subtotal += itemTotal;
            
            // Add to processed items
            processedItems.push({
                productId,
                product: {
                    _id: product._id,
                    name: product.name,
                    price: basePrice
                },
                quantity,
                selectedCondiments: validatedCondiments,
                itemPrice,
                totalPrice: itemTotal
            });
        }
        
        // Round subtotal
        subtotal = Math.round(subtotal * 100) / 100;
        
        // Calculate service fee
        const serviceFee = Math.round(subtotal * 0.1 * 100) / 100;
        
        // Calculate total
        const total = Math.round((subtotal + serviceFee) * 100) / 100;
        
        console.log(`Calculation complete - Subtotal: ${subtotal}, Service fee: ${serviceFee}, Total: ${total}`);
        
        return res.json({
            success: true,
            items: processedItems,
            count: processedItems.length,
            subtotal,
            serviceFee,
            total
        });
    } catch (err) {
        console.error('Calculate cart error:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error while calculating cart totals'
        });
    }
};
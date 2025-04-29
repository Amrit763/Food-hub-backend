const Product = require('../models/product.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * @route   GET /api/products/:id/condiments
 * @desc    Get all condiments for a product
 * @access  Public
 */
exports.getProductCondiments = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .select('condiments name');
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            productName: product.name,
            condiments: product.condiments || []
        });
    } catch (err) {
        console.error('Get product condiments error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * @route   POST /api/products/:id/condiments
 * @desc    Add a condiment to a product
 * @access  Private (Chef owner or Admin)
 */
exports.addProductCondiment = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        let product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Check ownership
        if (product.chef.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own products'
            });
        }
        
        // Create new condiment
        const newCondiment = {
            _id: new mongoose.Types.ObjectId(),
            name: req.body.name,
            price: req.body.price,
            isDefault: req.body.isDefault || false
        };
        
        // Add to condiments array
        if (!product.condiments) {
            product.condiments = [];
        }
        
        product.condiments.push(newCondiment);
        await product.save();
        
        res.status(201).json({
            success: true,
            condiment: newCondiment,
            message: 'Condiment added successfully'
        });
    } catch (err) {
        console.error('Add product condiment error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during condiment addition'
        });
    }
};

/**
 * @route   PUT /api/products/:id/condiments/:condimentId
 * @desc    Update a specific condiment
 * @access  Private (Chef owner or Admin)
 */
exports.updateProductCondiment = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        let product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Check ownership
        if (product.chef.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own products'
            });
        }
        
        // Find the condiment
        const condimentIndex = product.condiments.findIndex(
            c => c._id.toString() === req.params.condimentId
        );
        
        if (condimentIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Condiment not found'
            });
        }
        
        // Update condiment
        if (req.body.name) product.condiments[condimentIndex].name = req.body.name;
        if (req.body.price !== undefined) product.condiments[condimentIndex].price = req.body.price;
        if (req.body.isDefault !== undefined) product.condiments[condimentIndex].isDefault = req.body.isDefault;
        
        await product.save();
        
        res.json({
            success: true,
            condiment: product.condiments[condimentIndex],
            message: 'Condiment updated successfully'
        });
    } catch (err) {
        console.error('Update product condiment error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during condiment update'
        });
    }
};

/**
 * @route   DELETE /api/products/:id/condiments/:condimentId
 * @desc    Delete a specific condiment
 * @access  Private (Chef owner or Admin)
 */
exports.deleteProductCondiment = async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Check ownership
        if (product.chef.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own products'
            });
        }
        
        // Find the condiment
        const condimentIndex = product.condiments.findIndex(
            c => c._id.toString() === req.params.condimentId
        );
        
        if (condimentIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Condiment not found'
            });
        }
        
        // Remove condiment
        product.condiments.splice(condimentIndex, 1);
        await product.save();
        
        res.json({
            success: true,
            message: 'Condiment deleted successfully'
        });
    } catch (err) {
        console.error('Delete product condiment error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during condiment deletion'
        });
    }
};
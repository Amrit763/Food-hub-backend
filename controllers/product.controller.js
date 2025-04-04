const Product = require('../models/product.model');
const { validationResult } = require('express-validator');

// @route   POST /api/products
// @desc    Create a new product
// @access  Private (Chef only)
exports.createProduct = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        // Create new product
        const newProduct = new Product({
            chef: req.user._id,
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            category: req.body.category,
            tags: req.body.tags || [],
            images: req.body.images || [],
            ingredients: req.body.ingredients || [],
            allergens: req.body.allergens || [],
            preparationTime: req.body.preparationTime,
            servingSize: req.body.servingSize,
            isAvailable: req.body.isAvailable,
            isVegetarian: req.body.isVegetarian,
            isVegan: req.body.isVegan,
            isGlutenFree: req.body.isGlutenFree
        });

        // Save product
        const product = await newProduct.save();

        res.status(201).json({
            success: true,
            product
        });
    } catch (err) {
        console.error('Create product error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during product creation'
        });
    }
};

// @route   GET /api/products
// @desc    Get all products
// @access  Public
exports.getAllProducts = async (req, res) => {
    try {
        // Build query based on filters
        const queryObj = { isAvailable: true };
        
        // Category filter
        if (req.query.category) {
            queryObj.category = req.query.category;
        }
        
        // Chef filter
        if (req.query.chef) {
            queryObj.chef = req.query.chef;
        }
        
        // Price range filter
        if (req.query.minPrice || req.query.maxPrice) {
            queryObj.price = {};
            if (req.query.minPrice) queryObj.price.$gte = req.query.minPrice;
            if (req.query.maxPrice) queryObj.price.$lte = req.query.maxPrice;
        }
        
        // Dietary filters
        if (req.query.vegetarian === 'true') queryObj.isVegetarian = true;
        if (req.query.vegan === 'true') queryObj.isVegan = true;
        if (req.query.glutenFree === 'true') queryObj.isGlutenFree = true;
        
        // Sort options
        const sortBy = req.query.sort || '-createdAt'; // Default sort by newest
        
        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        
        // Execute query
        const products = await Product.find(queryObj)
            .populate('chef', 'fullName profileImage')
            .sort(sortBy)
            .skip(skip)
            .limit(limit);
            
        // Get total count
        const total = await Product.countDocuments(queryObj);
        
        res.json({
            success: true,
            count: products.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            products
        });
    } catch (err) {
        console.error('Get all products error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching products'
        });
    }
};

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
exports.searchProducts = async (req, res) => {
    try {
        const searchQuery = req.query.q;
        
        if (!searchQuery) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        // Text search
        const products = await Product.find(
            { 
                $text: { $search: searchQuery },
                isAvailable: true
            },
            { score: { $meta: 'textScore' } }
        )
        .populate('chef', 'fullName profileImage')
        .sort({ score: { $meta: 'textScore' } });
        
        res.json({
            success: true,
            count: products.length,
            products
        });
    } catch (err) {
        console.error('Search products error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during product search'
        });
    }
};

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('chef', 'fullName profileImage');
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            product
        });
    } catch (err) {
        console.error('Get product by ID error:', err.message);
        
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

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private (Chef owner or Admin)
exports.updateProduct = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        // Find product
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
        
        // Build update object
        const updateFields = {};
        
        if (req.body.name) updateFields.name = req.body.name;
        if (req.body.description) updateFields.description = req.body.description;
        if (req.body.price) updateFields.price = req.body.price;
        if (req.body.category) updateFields.category = req.body.category;
        if (req.body.tags) updateFields.tags = req.body.tags;
        if (req.body.ingredients) updateFields.ingredients = req.body.ingredients;
        if (req.body.allergens) updateFields.allergens = req.body.allergens;
        if (req.body.preparationTime) updateFields.preparationTime = req.body.preparationTime;
        if (req.body.servingSize) updateFields.servingSize = req.body.servingSize;
        if (req.body.isAvailable !== undefined) updateFields.isAvailable = req.body.isAvailable;
        if (req.body.isVegetarian !== undefined) updateFields.isVegetarian = req.body.isVegetarian;
        if (req.body.isVegan !== undefined) updateFields.isVegan = req.body.isVegan;
        if (req.body.isGlutenFree !== undefined) updateFields.isGlutenFree = req.body.isGlutenFree;
        
        // If new images uploaded, add them to existing images
        if (req.body.images && req.body.images.length > 0) {
            updateFields.images = [...product.images, ...req.body.images];
        }
        
        // Update product
        product = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).populate('chef', 'fullName profileImage');
        
        res.json({
            success: true,
            product
        });
    } catch (err) {
        console.error('Update product error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during product update'
        });
    }
};

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (Chef owner or Admin)
exports.deleteProduct = async (req, res) => {
    try {
        // Find product
        const product = await Product.findById(req.params.id);
        
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
                message: 'You can only delete your own products'
            });
        }
        
        // Delete product
        await product.remove();
        
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (err) {
        console.error('Delete product error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during product deletion'
        });
    }
};

// @route   GET /api/products/chef/:id
// @desc    Get all products by a chef
// @access  Public
exports.getChefProducts = async (req, res) => {
    try {
        const products = await Product.find({ 
            chef: req.params.id,
            isAvailable: true
        })
        .populate('chef', 'fullName profileImage')
        .sort('-createdAt');
        
        res.json({
            success: true,
            count: products.length,
            products
        });
    } catch (err) {
        console.error('Get chef products error:', err.message);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                message: 'Chef not found'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
const Product = require('../models/product.model');
const { validationResult } = require('express-validator');
const { deleteFile } = require('../utils/file-utils');

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private (Chef only)
 */
exports.createProduct = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }

    try {
        const newProduct = new Product({
            ...req.body,
            chef: req.user._id
        });

        // Images are already processed by the handleProductImagesUpload middleware
        // which adds the image paths to req.body.images

        await newProduct.save();
        
        res.status(201).json({
            success: true,
            product: newProduct,
            message: 'Product created successfully'
        });
    } catch (err) {
        console.error('Create product error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during product creation'
        });
    }
};

/**
 * @route   GET /api/products
 * @desc    Get all products
 * @access  Public
 */
exports.getAllProducts = async (req, res) => {
    try {
        // Extract query parameters for filtering
        const { 
            page = 1, 
            limit = 10,
            category,
            minPrice,
            maxPrice,
            vegetarian,
            vegan,
            glutenFree,
            sort = 'createdAt'
        } = req.query;

        // Build filter query
        const filterQuery = {
            isAvailable: true // Only show available products by default
        };

        if (category) filterQuery.category = category;
        if (minPrice) filterQuery.price = { $gte: parseFloat(minPrice) };
        if (maxPrice) {
            filterQuery.price = filterQuery.price 
                ? { ...filterQuery.price, $lte: parseFloat(maxPrice) }
                : { $lte: parseFloat(maxPrice) };
        }
        if (vegetarian === 'true') filterQuery.isVegetarian = true;
        if (vegan === 'true') filterQuery.isVegan = true;
        if (glutenFree === 'true') filterQuery.isGlutenFree = true;

        // Set up pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Set up sorting
        const sortOptions = {};
        if (sort === 'price') {
            sortOptions.price = 1; // Ascending price
        } else if (sort === 'price_desc') {
            sortOptions.price = -1; // Descending price
        } else if (sort === 'rating') {
            sortOptions.rating = -1; // Highest rating first
        } else {
            sortOptions.createdAt = -1; // Newest first (default)
        }

        // Execute query with pagination
        const products = await Product.find(filterQuery)
            .populate('chef', 'name profileImage')
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum);

        // Get total count for pagination
        const totalProducts = await Product.countDocuments(filterQuery);

        res.json({
            success: true,
            products,
            currentPage: pageNum,
            totalPages: Math.ceil(totalProducts / limitNum),
            totalProducts
        });
    } catch (err) {
        console.error('Get all products error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * @route   GET /api/products/search
 * @desc    Search products
 * @access  Public
 */
exports.searchProducts = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        // Create search regex
        const searchRegex = new RegExp(q, 'i');
        
        const products = await Product.find({
            isAvailable: true,
            $or: [
                { name: searchRegex },
                { description: searchRegex },
                { category: searchRegex }
            ]
        }).populate('chef', 'name profileImage');
        
        res.json({
            success: true,
            products,
            count: products.length,
            query: q
        });
    } catch (err) {
        console.error('Search products error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error during search'
        });
    }
};

/**
 * @route   GET /api/products/chef/:id
 * @desc    Get all products by a chef
 * @access  Public
 */
exports.getChefProducts = async (req, res) => {
    try {
        const products = await Product.find({ chef: req.params.id })
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            products,
            count: products.length
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

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Public
 */
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('chef', 'name profileImage biography');
        
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
        console.error('Get product by id error:', err.message);
        
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
 * @route   PUT /api/products/:id
 * @desc    Update a product
 * @access  Private (Chef owner or Admin)
 */
exports.updateProduct = async (req, res) => {
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
        
        // If new images were uploaded (processed by middleware), delete old images
        if (req.body.images && req.body.images.length > 0) {
            // Save the old image paths
            const oldImages = [...(product.images || [])];
            
            // Delete the old images that are being replaced
            console.log('Deleting old product images:', oldImages);
            oldImages.forEach(imagePath => {
                deleteFile(imagePath);
            });
        }
        
        // Update the product in the database
        product = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        
        res.json({
            success: true,
            product,
            message: 'Product updated successfully'
        });
    } catch (err) {
        console.error('Update product error:', err.message);
        
        res.status(500).json({
            success: false,
            message: 'Server error during product update'
        });
    }
};

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 * @access  Private (Chef owner or Admin)
 */
exports.deleteProduct = async (req, res) => {
    try {
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
        
        // Delete associated image files before deleting the product
        if (product.images && product.images.length > 0) {
            console.log('Deleting product images:', product.images);
            product.images.forEach(imagePath => {
                deleteFile(imagePath);
            });
        }
        
        // Now delete the product from the database
        await Product.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (err) {
        console.error('Delete product error:', err.message);
        
        res.status(500).json({
            success: false,
            message: 'Server error during product deletion'
        });
    }
};
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Adding a schema for condiments
const condimentSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    isDefault: {
        type: Boolean,
        default: false
    }
});

const productSchema = new Schema({
    chef: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Product description is required']
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: [0, 'Price cannot be negative']
    },
    category: {
        type: String,
        required: [true, 'Product category is required'],
        enum: ['appetizer', 'main course', 'dessert', 'beverage', 'snack']
    },
    tags: [String],
    images: [String],
    ingredients: [String],
    allergens: [String],
    condiments: [condimentSchema], // Added condiments array
    preparationTime: {
        type: Number, // in minutes
        default: 30
    },
    servingSize: {
        type: String,
        default: '1 person'
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isVegetarian: {
        type: Boolean,
        default: false
    },
    isVegan: {
        type: Boolean,
        default: false
    },
    isGlutenFree: {
        type: Boolean,
        default: false
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Add text index for search
productSchema.index({ 
    name: 'text', 
    description: 'text', 
    tags: 'text',
    ingredients: 'text',
    category: 'text'
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
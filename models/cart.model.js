const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for selected condiments
const selectedCondimentSchema = new Schema({
    condimentId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    }
});

// Main cart item schema
const cartItemSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    },
    selectedCondiments: [selectedCondimentSchema],
    // Store the total price of this cart item including selected condiments
    totalPrice: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    }
}, {
    timestamps: true
});

// Create a compound index to prevent duplicate products in cart
cartItemSchema.index({ user: 1, product: 1 }, { unique: true });

// Method to calculate the total price of an item including condiments
cartItemSchema.methods.calculateTotalPrice = function(basePrice) {
    console.log(`Calculating total price with basePrice: ${basePrice}`);
    
    // Ensure basePrice is a valid number
    let productPrice = Number(basePrice);
    if (isNaN(productPrice) || productPrice < 0) {
        console.warn(`Invalid basePrice: ${basePrice}, defaulting to 0`);
        productPrice = 0;
    }
    
    // Start with the base product price
    let total = productPrice;
    
    // Debug logging
    console.log(`Initial total (base price): ${total}`);
    
    // Add prices of all selected condiments
    if (this.selectedCondiments && this.selectedCondiments.length > 0) {
        console.log(`Adding prices for ${this.selectedCondiments.length} condiments`);
        
        for (const condiment of this.selectedCondiments) {
            const condimentPrice = Number(condiment.price);
            if (!isNaN(condimentPrice) && condimentPrice >= 0) {
                total += condimentPrice;
                console.log(`Added condiment price ${condimentPrice}, new total: ${total}`);
            } else {
                console.warn(`Invalid condiment price: ${condiment.price} for condiment: ${condiment.name}`);
            }
        }
    }
    
    // Get quantity as a valid number
    let quantityValue = Number(this.quantity);
    if (isNaN(quantityValue) || quantityValue < 1) {
        console.warn(`Invalid quantity: ${this.quantity}, defaulting to 1`);
        quantityValue = 1;
    }
    
    // Multiply by quantity
    console.log(`Multiplying total ${total} by quantity ${quantityValue}`);
    total *= quantityValue;
    
    // Round to 2 decimal places
    total = Math.round((total + Number.EPSILON) * 100) / 100;
    console.log(`Final total price: ${total}`);
    
    // Ensure we don't return NaN
    if (isNaN(total)) {
        console.warn('Total price calculation resulted in NaN, returning 0');
        return 0;
    }
    
    return total;
};

// Pre-save middleware to update totalPrice field
cartItemSchema.pre('save', async function(next) {
    try {
        console.log('Running pre-save middleware for cart item');
        
        // This requires populating the product first
        if (!this.populated('product')) {
            console.log('Product not populated, populating now');
            await this.populate('product', 'price');
        }
        
        // Debug logging
        if (this.product) {
            console.log(`Product populated, price: ${this.product.price}`);
        } else {
            console.warn('Product still not available after population attempt');
        }
        
        // Calculate total price
        if (this.product && typeof this.product.price === 'number') {
            this.totalPrice = this.calculateTotalPrice(this.product.price);
            console.log(`Set totalPrice to: ${this.totalPrice}`);
        } else {
            console.warn('Cannot calculate total price: valid product price not available');
            
            // Try to get a valid price from anywhere possible
            let backupPrice = 0;
            
            // If product exists but price is not a number, try to convert it
            if (this.product && this.product.price !== undefined) {
                backupPrice = Number(this.product.price);
                if (isNaN(backupPrice)) backupPrice = 0;
            }
            
            this.totalPrice = this.calculateTotalPrice(backupPrice);
            console.log(`Used backup price calculation, totalPrice: ${this.totalPrice}`);
        }
        
        // Final safety check
        if (isNaN(this.totalPrice)) {
            console.warn('totalPrice is still NaN after all calculations, setting to 0');
            this.totalPrice = 0;
        }
        
        next();
    } catch (error) {
        console.error('Error in cart item pre-save middleware:', error);
        // Set a safe default and continue
        this.totalPrice = 0;
        next();
    }
});

module.exports = mongoose.model('CartItem', cartItemSchema);
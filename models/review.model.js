// models/review.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
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
    order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        trim: true
    },
    images: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Ensure that a user can only leave one review per product per order
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

// Add text index for searching
reviewSchema.index({ comment: 'text' });

// Creating virtual for rating display
reviewSchema.virtual('formattedRating').get(function() {
    return this.rating.toFixed(1);
});

module.exports = mongoose.model('Review', reviewSchema);
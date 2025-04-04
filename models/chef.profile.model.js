// models/chef.profile.model.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chefProfileSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    specialization: {
        type: String,
        required: true
    },
    experience: {
        type: Number, // in years
        required: true
    },
    bio: {
        type: String,
        required: true
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    certificateImages: [String],
    portfolioImages: [String],
    rating: {
        type: Number,
        default: 0
    },
    reviewCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const ChefProfile = mongoose.model('ChefProfile', chefProfileSchema);

module.exports = ChefProfile;
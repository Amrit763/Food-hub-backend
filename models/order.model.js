// models/order.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for selected condiments in order
const OrderCondimentSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  }
});

const OrderItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  selectedCondiments: [OrderCondimentSchema], // Add selected condiments
  subtotal: {
    type: Number,
    required: true
  }
});

// Schema for chef-specific items and status tracking
const ChefItemsSchema = new Schema({
  chef: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [OrderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'received', 'in_progress', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'received', 'in_progress', 'ready', 'delivered', 'cancelled'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
});

const OrderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [OrderItemSchema],
  chefItems: [ChefItemsSchema],  // Group items by chef with separate status tracking
  totalAmount: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  },
  serviceFee: {
    type: Number,
    required: true
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  deliveryDate: {
    type: String,
    required: true
  },
  deliveryTime: {
    type: String,
    required: true
  },
  deliveryNotes: {
    type: String
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'received', 'in_progress', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'received', 'in_progress', 'ready', 'delivered', 'cancelled'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Added fields for soft delete
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  reviewedItems: [{
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
    },
    reviewId: {
        type: Schema.Types.ObjectId,
        ref: 'Review'
    },
    reviewedAt: {
        type: Date,
        default: Date.now
    }
}]
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
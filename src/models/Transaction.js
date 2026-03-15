const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  // Link to user who owns this transaction
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Link to the product that was purchased
  productLinkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductLink',
    required: true,
  },
  
  // Customer's phone number (encrypted in real app)
  customerPhone: {
    type: String,
    required: true,
  },
  
  // Transaction amount and currency
  amount: {
    type: Number,
    required: true,
  },
  
  currency: {
    type: String,
    default: 'USD',
  },
  
  // Payment method used
  paymentMethod: {
    type: String,
    enum: ['orange', 'mtn', 'card'],
    required: true,
  },
  
  // Transaction status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  
  // Unique transaction ID from payment gateway
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  
  // Track phone verification
  customerVerified: {
    type: Boolean,
    default: false,
  },
  
  verificationAttempts: {
    type: Number,
    default: 0,
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
  completedAt: {
    type: Date,
  },
});

module.exports = mongoose.model('Transaction', TransactionSchema);
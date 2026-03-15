// Application constants - keeps all fixed values in one place

// Available subscription plans with their limits
const SUBSCRIPTION_PLANS = {
    STARTER: {
      name: 'starter',
      price: 0,
      maxLinks: 10,
      features: ['orange', 'mtn'], // Available payment methods
    },
    BUSINESS: {
      name: 'business',
      price: 9.99,
      maxLinks: 50,
      features: ['orange', 'mtn', 'card'],
    },
    ENTERPRISE: {
      name: 'enterprise',
      price: 29.99,
      maxLinks: -1, // -1 means unlimited
      features: ['orange', 'mtn', 'card'],
    },
  };
  
  // Transaction status constants
  const TRANSACTION_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
  };
  
  // Payment method constants
  const PAYMENT_METHODS = {
    ORANGE: 'orange',
    MTN: 'mtn',
    CARD: 'card',
  };
  
  module.exports = {
    SUBSCRIPTION_PLANS,
    TRANSACTION_STATUS,
    PAYMENT_METHODS,
  };
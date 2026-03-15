// Middleware to automatically check and handle subscription expiration
const Subscription = require('../models/Subscription');

const checkSubscriptionStatus = async (req, res, next) => {
  try {
    // Only check if user is authenticated
    if (req.user && req.user.id) {
      const subscription = await Subscription.findOne({ userId: req.user.id });
      
      if (subscription) {
        // Check if subscription needs to be downgraded
        const expirationResult = await subscription.checkAndHandleExpiration();
        
        // If subscription was downgraded, log it
        if (expirationResult.downgraded) {
          console.log(`Subscription auto-downgraded for user ${req.user.id}:`, expirationResult.message);
        }
        
        // Attach subscription info to request for use in other middleware/routes
        req.subscription = subscription;
      }
    }
    
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    // Don't block the request if subscription check fails
    next();
  }
};

module.exports = { checkSubscriptionStatus };
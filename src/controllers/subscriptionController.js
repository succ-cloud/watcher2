// Import required models
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Transaction = require('../models/Transaction');


// ... existing imports ...

// @desc    Get current user's subscription (with auto-expiration check)
// @route   GET /api/subscriptions/me
// @access  Private
const getMySubscription = async (req, res) => {
    try {
        // Find subscription for the current user
        let subscription = await Subscription.findOne({ userId: req.user.id });

        if (!subscription) {
            // Create starter plan if doesn't exist
            subscription = await Subscription.create({
                userId: req.user.id,
                plan: 'starter',
                price: 0,
                currency: 'USD',
                status: 'active',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                paymentMethod: 'free',
                features: Subscription.getPlanDetails('starter').features,
            });

            // Update user's subscription info
            await User.findByIdAndUpdate(req.user.id, {
                'subscription.plan': 'starter',
                'subscription.status': 'active',
                'subscription.startDate': new Date(),
                'subscription.endDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            });

            return res.json({
                success: true,
                data: subscription,
                message: 'Starter plan activated'
            });
        }

        // Always check for expiration before returning subscription data
        const expirationResult = await subscription.checkAndHandleExpiration();

        // Refresh the subscription data after potential downgrade
        if (expirationResult.downgraded) {
            subscription = await Subscription.findOne({ userId: req.user.id });
        }

        res.json({
            success: true,
            data: subscription,
            autoAction: expirationResult.downgraded ? expirationResult : null
        });
    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subscription'
        });
    }
};

// @desc    Upgrade user subscription
// @route   POST /api/subscriptions/upgrade
// @access  Private
const upgradeSubscription = async (req, res) => {
    try {
        const { plan, paymentMethod, duration = 'monthly' } = req.body;

        // Validate plan
        const availablePlans = ['starter', 'business', 'enterprise'];
        if (!availablePlans.includes(plan)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan selected'
            });
        }

        // Don't allow "upgrading" to starter plan
        if (plan === 'starter') {
            return res.status(400).json({
                success: false,
                message: 'Cannot upgrade to starter plan. Use cancel instead.'
            });
        }

        // Find current subscription
        let subscription = await Subscription.findOne({ userId: req.user.id });

        if (!subscription) {
            // Create new subscription if doesn't exist
            subscription = new Subscription({
                userId: req.user.id,
            });
        }

        // Get plan details
        const planDetails = Subscription.getPlanDetails(plan);

        // Calculate period end based on duration
        const now = new Date();
        let periodEnd = new Date();

        if (duration === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // For demo purposes, simulate payment processing
        if (plan !== 'starter') {
            const paymentTransaction = await Transaction.create({
                userId: req.user.id,
                amount: planDetails.price,
                currency: 'USD',
                paymentMethod: paymentMethod || 'card',
                status: 'completed',
                transactionId: `sub_${Date.now()}`,
                customerPhone: req.user.phone,
            });

            subscription.paymentTransactionId = paymentTransaction._id;
        }

        // Upgrade the subscription
        subscription.plan = plan;
        subscription.price = planDetails.price;
        subscription.currency = 'USD';
        subscription.billingCycle = duration;
        subscription.status = 'active';
        subscription.paymentMethod = paymentMethod || 'card';
        subscription.currentPeriodStart = now;
        subscription.currentPeriodEnd = periodEnd;
        subscription.features = planDetails.features;
        subscription.cancelAtPeriodEnd = false; // Reset cancel flag
        subscription.canceledAt = null; // Clear cancellation date

        await subscription.save();

        // Update user's subscription reference
        await User.findByIdAndUpdate(req.user.id, {
            'subscription.plan': plan,
            'subscription.status': 'active',
            'subscription.startDate': now,
            'subscription.endDate': periodEnd,
        });

        res.json({
            success: true,
            data: subscription,
            message: `Successfully upgraded to ${plan} plan (${duration})`
        });
    } catch (error) {
        console.error('Upgrade subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Error upgrading subscription'
        });
    }
};

// @desc    Cancel subscription (will auto-downgrade to starter when expired)
// @route   POST /api/subscriptions/cancel
// @access  Private
const cancelSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ userId: req.user.id });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'No subscription found'
            });
        }

        if (subscription.plan === 'starter') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel free starter plan'
            });
        }

        // Mark for cancellation at period end (won't auto-renew)
        subscription.cancelAtPeriodEnd = true;
        subscription.canceledAt = new Date();
        await subscription.save();

        // Update user's subscription status
        await User.findByIdAndUpdate(req.user.id, {
            'subscription.status': 'canceled'
        });

        res.json({
            success: true,
            data: subscription,
            message: 'Subscription canceled successfully. It will remain active until the end of the billing period, then automatically downgrade to starter plan.'
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Error canceling subscription'
        });
    }
};

// ... rest of the controller methods ...

// @desc    Get all available plans
// @route   GET /api/subscriptions/plans
// @access  Public
const getAvailablePlans = async (req, res) => {
    try {
        const plans = {
            starter: Subscription.getPlanDetails('starter'),
            business: Subscription.getPlanDetails('business'),
            enterprise: Subscription.getPlanDetails('enterprise')
        };

        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available plans'
        });
    }
};







const getSubscriptionUsage = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ userId: req.user.id });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'No subscription found'
            });
        }

        const usage = {
            productLinks: {
                used: subscription.usage.productLinksCreated,
                limit: subscription.features.maxProductLinks,
                percentage: subscription.features.maxProductLinks === -1 ?
                    0 : (subscription.usage.productLinksCreated / subscription.features.maxProductLinks) * 100
            },
            transactions: subscription.usage.transactionsThisMonth,
            revenue: subscription.usage.revenueThisMonth,
            daysRemaining: subscription.getDaysRemaining(),
            canCreateMoreLinks: subscription.canCreateProductLink()
        };

        res.json({
            success: true,
            data: usage
        });
    } catch (error) {
        console.error('Get usage error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subscription usage'
        });
    }
};

// @desc    Update subscription usage (called internally when user creates product links)
// @route   PUT /api/subscriptions/usage
// @access  Private
const updateSubscriptionUsage = async (req, res) => {
    try {
        const { action, amount = 1 } = req.body;

        const subscription = await Subscription.findOne({ userId: req.user.id });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'No subscription found'
            });
        }

        switch (action) {
            case 'product_link_created':
                subscription.usage.productLinksCreated += amount;
                break;
            case 'transaction_processed':
                subscription.usage.transactionsThisMonth += amount;
                break;
            case 'revenue_generated':
                subscription.usage.revenueThisMonth += amount;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action'
                });
        }

        await subscription.save();

        res.json({
            success: true,
            data: subscription.usage
        });
    } catch (error) {
        console.error('Update usage error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating subscription usage'
        });
    }
};
// Add this new method for handling enterprise to business downgrade
const handleEnterpriseToBusinessDowngrade = async (req, res) => {
    try {
      const subscription = await Subscription.findOne({ userId: req.user.id });
  
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'No subscription found'
        });
      }
  
      if (subscription.plan !== 'enterprise') {
        return res.status(400).json({
          success: false,
          message: 'Only Enterprise plan users can downgrade to Business'
        });
      }
  
      // Handle the downgrade and link management
      const downgradeResult = await subscription.handleEnterpriseToBusinessDowngrade();
      
      // Update to business plan
      const businessPlan = Subscription.getPlanDetails('business');
      subscription.plan = 'business';
      subscription.price = businessPlan.price;
      subscription.features = businessPlan.features;
      subscription.status = 'active';
      
      await subscription.save();
  
      // Update user's subscription info
      await User.findByIdAndUpdate(req.user.id, {
        'subscription.plan': 'business',
        'subscription.status': 'active',
      });
  
      res.json({
        success: true,
        data: {
          subscription,
          downgradeResult
        },
        message: `Successfully downgraded to Business plan. ${downgradeResult.message}`
      });
    } catch (error) {
      console.error('Enterprise to Business downgrade error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing downgrade'
      });
    }
  };
  
 
module.exports = {
    handleEnterpriseToBusinessDowngrade,
    getMySubscription,
    getAvailablePlans,
    upgradeSubscription,
    cancelSubscription,
    getSubscriptionUsage,
    updateSubscriptionUsage,
};
// Import required models and utilities
const ProductLink = require('../models/ProductLink');
const Subscription = require('../models/Subscription');
const { generateShortCode, normalizePhoneNumber } = require('../utils/helpers');

// @desc    Generate a new payment link
// @route   POST /api/links/generate
// @access  Private
const generatePaymentLink = async (req, res) => {
  try {
    const { productName, productDescription, price, currency = 'USD', paymentMethods } = req.body;

    // Validate required fields
    if (!productName || !price) {
      return res.status(400).json({
        success: false,
        message: 'Product name and price are required'
      });
    }

    // Validate price is positive number
    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0'
      });
    }

    // Validate payment methods
    if (!paymentMethods || !Array.isArray(paymentMethods) || paymentMethods.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one payment method is required'
      });
    }

    // Check user's subscription to ensure they can create more links
    const subscription = await Subscription.findOne({ userId: req.user.id });
    
    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Check if user can create more product links
    const canCreateResult = subscription.canCreateProductLink();
    if (!canCreateResult.canCreate) {
      return res.status(400).json({
        success: false,
        message: canCreateResult.reason
      });
    }

    // Generate unique short code
    let shortCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 5;

    // Keep generating until we get a unique short code
    while (!isUnique && attempts < maxAttempts) {
      shortCode = generateShortCode(productName);
      
      // Check if short code already exists
      const existingLink = await ProductLink.findOne({ shortCode });
      if (!existingLink) {
        isUnique = true;
      }
      
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Unable to generate unique payment link. Please try again.'
      });
    }

    // Create the payment link
    const paymentLink = await ProductLink.create({
      userId: req.user.id,
      shortCode,
      productName,
      productDescription: productDescription || '',
      price: parseFloat(price),
      currency,
      paymentMethods,
      generatedLink: `${process.env.CLIENT_URL || 'http://localhost:3000'}/pay/${shortCode}`,
      isActive: true
    });

    // Update subscription usage
    subscription.usage.productLinksCreated += 1;
    await subscription.save();

    res.status(201).json({
      success: true,
      data: paymentLink,
      message: 'Payment link generated successfully'
    });
  } catch (error) {
    console.error('Generate payment link error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A payment link with similar details already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error generating payment link'
    });
  }
};

// @desc    Get all payment links for current user
// @route   GET /api/links
// @access  Private
const getMyPaymentLinks = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Parse pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get payment links with pagination
    const paymentLinks = await ProductLink.find({ userId: req.user.id })
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean for better performance

    // Get total count for pagination
    const total = await ProductLink.countDocuments({ userId: req.user.id });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      data: {
        paymentLinks,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          hasNextPage,
          hasPrevPage,
          itemsPerPage: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Get payment links error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment links'
    });
  }
};

// @desc    Get single payment link by ID
// @route   GET /api/links/:id
// @access  Private
const getPaymentLinkById = async (req, res) => {
  try {
    const paymentLink = await ProductLink.findOne({
      _id: req.params.id,
      userId: req.user.id // Ensure user owns this link
    });

    if (!paymentLink) {
      return res.status(404).json({
        success: false,
        message: 'Payment link not found'
      });
    }

    res.json({
      success: true,
      data: paymentLink
    });
  } catch (error) {
    console.error('Get payment link error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment link ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error fetching payment link'
    });
  }
};

// @desc    Update a payment link
// @route   PUT /api/links/:id
// @access  Private
const updatePaymentLink = async (req, res) => {
  try {
    const { productName, productDescription, price, currency, paymentMethods, isActive } = req.body;

    // Find the payment link and verify ownership
    let paymentLink = await ProductLink.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!paymentLink) {
      return res.status(404).json({
        success: false,
        message: 'Payment link not found'
      });
    }

    // Update fields if provided
    const updateFields = {};
    if (productName !== undefined) updateFields.productName = productName;
    if (productDescription !== undefined) updateFields.productDescription = productDescription;
    if (price !== undefined) updateFields.price = parseFloat(price);
    if (currency !== undefined) updateFields.currency = currency;
    if (paymentMethods !== undefined) updateFields.paymentMethods = paymentMethods;
    if (isActive !== undefined) updateFields.isActive = isActive;

    // Update the payment link
    paymentLink = await ProductLink.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true } // Return updated document and run validators
    );

    res.json({
      success: true,
      data: paymentLink,
      message: 'Payment link updated successfully'
    });
  } catch (error) {
    console.error('Update payment link error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment link ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating payment link'
    });
  }
};

// @desc    Delete a payment link
// @route   DELETE /api/links/:id
// @access  Private
const deletePaymentLink = async (req, res) => {
  try {
    const paymentLink = await ProductLink.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!paymentLink) {
      return res.status(404).json({
        success: false,
        message: 'Payment link not found'
      });
    }

    // Update subscription usage (decrement count)
    const subscription = await Subscription.findOne({ userId: req.user.id });
    if (subscription && subscription.usage.productLinksCreated > 0) {
      subscription.usage.productLinksCreated -= 1;
      await subscription.save();
    }

    res.json({
      success: true,
      message: 'Payment link deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment link error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment link ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error deleting payment link'
    });
  }
};

// @desc    Get payment link analytics
// @route   GET /api/links/:id/analytics
// @access  Private
const getPaymentLinkAnalytics = async (req, res) => {
  try {
    const paymentLink = await ProductLink.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!paymentLink) {
      return res.status(404).json({
        success: false,
        message: 'Payment link not found'
      });
    }

    // In a real application, you would get more detailed analytics from a separate analytics service
    const analytics = {
      totalClicks: paymentLink.totalClicks,
      successfulPayments: paymentLink.successfulPayments,
      conversionRate: paymentLink.totalClicks > 0 
        ? (paymentLink.successfulPayments / paymentLink.totalClicks * 100).toFixed(2)
        : 0,
      totalRevenue: paymentLink.successfulPayments * paymentLink.price,
      performance: paymentLink.totalClicks === 0 ? 'No data' :
                  (paymentLink.successfulPayments / paymentLink.totalClicks) > 0.1 ? 'Good' :
                  (paymentLink.successfulPayments / paymentLink.totalClicks) > 0.05 ? 'Average' : 'Poor'
    };

    res.json({
      success: true,
      data: {
        paymentLink: {
          productName: paymentLink.productName,
          price: paymentLink.price,
          currency: paymentLink.currency
        },
        analytics
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment link analytics'
    });
  }
};

// @desc    Get public payment link details (for checkout page)
// @route   GET /api/links/public/:shortCode
// @access  Public
const getPublicPaymentLink = async (req, res) => {
  try {
    const { shortCode } = req.params;

    const paymentLink = await ProductLink.findOne({
      shortCode,
      isActive: true
    }).populate('userId', 'businessName'); // Include business name for display

    if (!paymentLink) {
      return res.status(404).json({
        success: false,
        message: 'Payment link not found or inactive'
      });
    }

    // Increment click counter
    paymentLink.totalClicks += 1;
    await paymentLink.save();

    // Return public-facing data only (no sensitive info)
    const publicData = {
      id: paymentLink._id,
      productName: paymentLink.productName,
      productDescription: paymentLink.productDescription,
      price: paymentLink.price,
      currency: paymentLink.currency,
      paymentMethods: paymentLink.paymentMethods,
      businessName: paymentLink.userId.businessName,
      shortCode: paymentLink.shortCode
    };

    res.json({
      success: true,
      data: publicData
    });
  } catch (error) {
    console.error('Get public payment link error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment link details'
    });
  }
};

module.exports = {
  generatePaymentLink,
  getMyPaymentLinks,
  getPaymentLinkById,
  updatePaymentLink,
  deletePaymentLink,
  getPaymentLinkAnalytics,
  getPublicPaymentLink,
};
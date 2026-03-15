// src/controllers/authController.js - UPDATED FOR PHONE LOGIN
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your-jwt-secret',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    console.log('📥 Registration request:', req.body);
    
    const { email, phone, password, businessName, businessAddress } = req.body;

    // Validate required fields
    if (!email || !phone || !password || !businessName || !businessAddress) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { phone }] 
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      phone,
      password,
      businessName,
      businessAddress
    });

    // Save user
    await user.save();
    
    console.log('✅ User saved:', user._id);

    // Generate token
    const token = generateToken(user._id);

    // Prepare response data
    const userData = {
      id: user._id,
      email: user.email,
      phone: user.formatPhoneNumber(),
      phoneOperator: user.phoneOperator,
      businessName: user.businessName,
      businessAddress: user.businessAddress,
      subscriptionPlan: user.subscriptionPlan,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: userData
    });

  } catch (error) {
    console.error('❌ Registration error:', error.message);
    
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email or phone already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Login user with phone
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    console.log('📱 Login attempt for phone:', phone);

    // Validate input
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required'
      });
    }

    // Find user by phone (phone field stores digits only)
    const user = await User.findOne({ phone }).select('+password');

    if (!user) {
      console.log('❌ User not found for phone:', phone);
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      console.log('❌ Password mismatch for user:', user.email);
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Prepare response data
    const userData = {
      id: user._id,
      email: user.email,
      phone: user.formatPhoneNumber(),
      phoneOperator: user.phoneOperator,
      businessName: user.businessName,
      businessAddress: user.businessAddress,
      subscriptionPlan: user.subscriptionPlan,
      accountLimits: user.accountLimits,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      lastLogin: user.lastLogin
    };

    console.log('✅ Login successful for:', user.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-__v -password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Verify phone number
// @route   POST /api/auth/verify-phone
// @access  Private
exports.verifyPhone = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone already verified'
      });
    }

    // Check verification code (in production, you'd validate against stored code)
    if (!code || code !== '123456') { // Temporary fixed code for testing
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Verify phone
    user.isPhoneVerified = true;
    await user.save();

    res.json({
      success: true,
      message: 'Phone number verified successfully'
    });

  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
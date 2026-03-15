// src/models/User.js - FIXED VERSION
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Cameroon mobile operators prefixes
const CAMEROON_OPERATORS = {
  MTN: ['67', '68', '65', '69', '66'],
  ORANGE: ['69', '65', '67', '68', '66'],
  NEXTTEL: ['66']
};

// Helper function to detect Cameroon operator
function detectCameroonOperator(phoneNumber) {
  const cleaned = phoneNumber.replace(/\D/g, '');
  let number = cleaned;
  
  if (cleaned.startsWith('237')) {
    number = cleaned.substring(3);
  }
  
  const prefix = number.substring(0, 2);
  
  if (CAMEROON_OPERATORS.MTN.includes(prefix)) return 'MTN';
  if (CAMEROON_OPERATORS.ORANGE.includes(prefix)) return 'ORANGE';
  if (CAMEROON_OPERATORS.NEXTTEL.includes(prefix)) return 'NEXTTEL';
  
  return 'UNKNOWN';
}

// Helper function to validate Cameroon phone number
function isValidCameroonPhone(phoneNumber) {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (!cleaned.startsWith('237')) return false;
  if (cleaned.length !== 12) return false;
  
  const operator = detectCameroonOperator(phoneNumber);
  return operator !== 'UNKNOWN';
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: isValidCameroonPhone,
      message: 'Please enter a valid Cameroon phone number (e.g., +237680123456)'
    }
  },
  
  phoneOperator: {
    type: String,
    enum: ['MTN', 'ORANGE', 'NEXTTEL'],
    default: function() {
      // Set default based on phone number
      return detectCameroonOperator(this.phone);
    }
  },
  
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  
  businessName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  businessAddress: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save middleware to ensure phoneOperator is set
userSchema.pre('save', function(next) {
  // Always set phoneOperator based on phone number
  if (this.phone) {
    this.phoneOperator = detectCameroonOperator(this.phone);
  }
  
  // Format business name
  if (this.businessName) {
    this.businessName = this.businessName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to format phone number for display
userSchema.methods.formatPhoneNumber = function() {
  if (!this.phone) return '';
  
  const digits = this.phone.replace(/\D/g, '');
  if (digits.startsWith('237') && digits.length === 12) {
    const rest = digits.substring(3);
    return `+237 ${rest.substring(0, 3)} ${rest.substring(3, 6)} ${rest.substring(6)}`;
  }
  return this.phone;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
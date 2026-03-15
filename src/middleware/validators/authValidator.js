const { body } = require('express-validator');

// Cameroon phone validation
const isValidCameroonPhone = (value) => {
  const cleaned = value.replace(/\D/g, '');
  
  // Must start with Cameroon code
  if (!cleaned.startsWith('237')) {
    throw new Error('Phone number must start with Cameroon country code (+237)');
  }
  
  // Must be 12 digits total
  if (cleaned.length !== 12) {
    throw new Error('Phone number must be 12 digits including country code');
  }
  
  // Check operator prefix (first 2 digits after 237)
  const prefix = cleaned.substring(3, 5);
  const validPrefixes = ['67', '68', '65', '69', '66'];
  
  if (!validPrefixes.includes(prefix)) {
    throw new Error('Invalid Cameroon mobile number prefix');
  }
  
  return true;
};

// Register validation rules
exports.registerValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
    
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .custom(isValidCameroonPhone)
    .trim(),
    
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    
  body('businessName')
    .notEmpty().withMessage('Business name is required')
    .trim()
    .isLength({ max: 100 }).withMessage('Business name cannot exceed 100 characters'),
    
  body('businessAddress')
    .notEmpty().withMessage('Business address is required')
    .trim()
    .isLength({ max: 200 }).withMessage('Business address cannot exceed 200 characters')
];

// Login validation rules
exports.loginValidator = [
  body('email')
    .optional()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
    
  body('phone')
    .optional()
    .custom((value, { req }) => {
      if (!req.body.email && !value) {
        throw new Error('Please provide email or phone number');
      }
      if (value) {
        return isValidCameroonPhone(value);
      }
      return true;
    })
    .trim(),
    
  body('password')
    .notEmpty().withMessage('Password is required')
];
// Helper functions for common tasks

// Generate a random short code for payment links
const generateShortCode = (productName) => {
    // Create a slug from product name (remove spaces, special chars)
    const nameSlug = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    
    // Add random characters for uniqueness
    const randomChars = Math.random().toString(36).substring(2, 8);
    
    return `${nameSlug}-${randomChars}`;
  };
  
  // Format phone number to standard format
  const normalizePhoneNumber = (phone) => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Remove +237 prefix if present
    if (digitsOnly.startsWith('237')) {
      return digitsOnly.substring(3);
    }
    
    return digitsOnly;
  };
  
  // Generate JWT token
  const generateToken = (userId) => {
    // Import jwt
    const jwt = require('jsonwebtoken');
    
    // Create token that expires in 7 days
    return jwt.sign(
      { id: userId }, // Payload (data to encode)
      process.env.JWT_SECRET, // Secret key
      { expiresIn: process.env.JWT_EXPIRES_IN } // Expiration
    );
  };
  
  module.exports = {
    generateShortCode,
    normalizePhoneNumber,
    generateToken,
  };
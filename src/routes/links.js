const express = require('express');
const router = express.Router();

// Import controller functions
const {
  generatePaymentLink,
  getMyPaymentLinks,
  getPaymentLinkById,
  updatePaymentLink,
  deletePaymentLink,
  getPaymentLinkAnalytics,
  getPublicPaymentLink,
} = require('../controllers/linkController');

// Import middleware
const { protect } = require('../middleware/auth');

// Define routes

// GET /api/links/public/:shortCode - Get public payment link details (no auth required)
router.get('/public/:shortCode', getPublicPaymentLink);

// All routes below require authentication
router.use(protect);

// POST /api/links/generate - Generate new payment link
router.post('/generate', generatePaymentLink);

// GET /api/links - Get all payment links for current user
router.get('/', getMyPaymentLinks);

// GET /api/links/:id - Get single payment link
router.get('/:id', getPaymentLinkById);

// PUT /api/links/:id - Update payment link
router.put('/:id', updatePaymentLink);

// DELETE /api/links/:id - Delete payment link
router.delete('/:id', deletePaymentLink);

// GET /api/links/:id/analytics - Get payment link analytics
router.get('/:id/analytics', getPaymentLinkAnalytics);

module.exports = router;
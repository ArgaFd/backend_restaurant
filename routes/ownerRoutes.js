const express = require('express');
const { query } = require('express-validator');
const { protect } = require('../middleware/auth');
const { ownerOnly } = require('../middleware/roleValidation');
const { validate } = require('../middleware/validate');
const { getSalesReport } = require('../controllers/ownerController');

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(ownerOnly);

/**
 * @route   GET /api/owner/reports/sales
 * @desc    Get sales report
 * @access  Owner only
 * @query   period - daily, weekly, monthly, custom
 * @query   start - Start date (YYYY-MM-DD), required for custom period
 * @query   end - End date (YYYY-MM-DD), required for custom period
 */
router.get('/reports/sales', [
  query('period')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'custom'])
    .withMessage('Period must be daily, weekly, monthly, or custom'),
  query('start')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)'),
  query('end')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date (YYYY-MM-DD)')
], validate, getSalesReport);

module.exports = router;

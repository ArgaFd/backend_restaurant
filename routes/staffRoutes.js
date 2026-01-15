const express = require('express');
const { body, param, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  getOrders,
  updateOrderStatus,
  confirmManualPayment,
  getReceipt,
} = require('../controllers/staffController');

// Import staff management controllers
const {
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff
} = require('../controllers/staffController');

const router = express.Router();

// Protect all routes
router.use(protect);

router.route('/')
  .get(authorize('owner'), getAllStaff)
  .post([
    authorize('owner'),
    body('name', 'Name is required').notEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ], validate, createStaff);

router.route('/:id')
  .put([
    authorize('owner'),
    param('id', 'Staff ID is required').isInt(),
    body('name', 'Name is required').optional().notEmpty(),
    body('email', 'Please include a valid email').optional().isEmail(),
    body('status', 'Status must be active or inactive').optional().isIn(['active', 'inactive'])
  ], validate, updateStaff)
  .delete([
    authorize('owner'),
    param('id', 'Staff ID is required').isInt()
  ], validate, deleteStaff);

// Order management routes
router.use(authorize('staff', 'owner'));

// List orders with optional status filter and pagination
router.get('/orders', [
  query('status').optional().isIn(['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], validate, getOrders);

// Update order status
router.put('/orders/:id/status', [
  param('id', 'Order ID is required').isInt(),
  body('status', 'Status is required').isIn(['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'])
], validate, updateOrderStatus);

// Confirm manual payment
router.post('/payments/manual/:id/confirm', [
  param('id', 'Order ID is required').isInt()
], validate, confirmManualPayment);

// Get receipt (simple JSON view)
router.get('/orders/:id/receipt', [
  param('id', 'Order ID is required').isInt()
], validate, getReceipt);

module.exports = router;

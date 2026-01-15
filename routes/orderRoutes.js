const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createOrder,
  createGuestOrder,
  getOrders,
  getOrder,
  getGuestOrder,
  updateOrderStatus,
  updateOrderItemStatus
} = require('../controllers/orderController');

const router = express.Router();

// Guest (no login) - create order from QR menu flow
router.post('/guest', [
  body('tableNumber', 'Table number is required').isInt({ min: 1 }),
  body('customerName', 'Customer name is required').not().isEmpty(),
  body('items', 'Order items are required').isArray({ min: 1 }),
  body('items.*.menuId', 'Menu item ID is required').isInt(),
  body('items.*.quantity', 'Quantity must be at least 1').isInt({ min: 1 }),
], validate, createGuestOrder);

router.get('/guest/:id', [
  param('id', 'Please provide a valid order ID').isInt(),
], validate, getGuestOrder);

// Protected routes (require authentication)
router.use(protect);

// Customer and Staff can create orders
router.post('/', [
  body('tableNumber', 'Table number is required').isInt({ min: 1 }),
  body('items', 'Order items are required').isArray({ min: 1 }),
  body('items.*.menuId', 'Menu item ID is required').isInt(),
  body('items.*.quantity', 'Quantity must be at least 1').isInt({ min: 1 }),
  body('paymentMethod', 'Payment method is required').optional().isIn(['cash', 'midtrans'])
], validate, createOrder);

// Staff and Owner can view all orders
router.get('/', [
  authorize('staff', 'owner')
], getOrders);

// Anyone can view their own order
router.get('/:id', [
  param('id', 'Please provide a valid order ID').isInt()
], validate, getOrder);

// Staff and Owner can update order status
router.put('/:id/status', [
  authorize('staff', 'owner'),
  param('id', 'Please provide a valid order ID').isInt(),
  body('status', 'Status is required').isIn(['pending', 'processing', 'completed', 'cancelled'])
], validate, updateOrderStatus);

// Staff and Owner can update order item status
router.put('/order-items/:id/status', [
  authorize('staff', 'owner'),
  param('id', 'Please provide a valid order item ID').isInt(),
  body('status', 'Status is required').isIn(['pending', 'preparing', 'ready', 'served', 'cancelled'])
], validate, updateOrderItemStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes
router.post(
  '/',
  protect,
  [
    body('tableNumber', 'Table number is required').not().isEmpty(),
    body('customerName', 'Customer name is required').not().isEmpty(),
    body('items', 'Order items are required').isArray({ min: 1 }),
    body('items.*.menuId', 'Menu ID is required').not().isEmpty(),
    body('items.*.quantity', 'Quantity is required').isInt({ min: 1 }),
    body('paymentMethod', 'Payment method is required').optional().isIn(['cash', 'card', 'digital'])
  ],
  orderController.createOrder
);

router.get('/', protect, authorize('admin', 'staff'), orderController.getOrders);
router.get('/my', protect, orderController.getMyOrders);
router.get('/:id', protect, orderController.getOrderById);

// Admin/Staff routes
router.put(
  '/:id/status',
  [protect, authorize('admin', 'staff')],
  [
    body('status', 'Status is required').isIn(['pending', 'preparing', 'ready', 'completed', 'cancelled'])
  ],
  orderController.updateOrderStatus
);

router.put(
  '/:id/payment',
  [protect, authorize('admin', 'staff')],
  [
    body('status', 'Payment status is required').isIn(['pending', 'paid', 'failed', 'refunded']),
    body('amount', 'Amount is required').isNumeric()
  ],
  orderController.updatePaymentStatus
);

module.exports = router;

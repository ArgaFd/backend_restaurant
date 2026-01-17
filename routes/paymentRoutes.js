const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const paymentController = require('../controllers/paymentController');
const verifyMidtrans = require('../middleware/verifyMidtrans');

const router = express.Router();

// Webhook Midtrans
router.post(
  '/midtrans-webhook',
  express.json({ type: 'application/json' }),
  verifyMidtrans,
  paymentController.handleMidtransWebhook
);

// Guest Payments
router.post('/guest/pay', paymentController.createGuestDigitalPayment);
router.post('/guest/manual', paymentController.createGuestManualPayment);

// Payment Process (Staff/Owner) - Support both POST / and POST /process
const paymentValidation = [
  protect,
  authorize('staff', 'owner'),
  // Validate orderId OR order_id
  body().custom((value) => {
    if (!value.orderId && !value.order_id) {
      throw new Error('ID Pesanan harus disertakan');
    }
    return true;
  }),
  body('amount').isFloat({ min: 0 }).withMessage('Jumlah tidak valid'),
  body('paymentMethod').optional().isString(),
  body('payment_method').optional().isString(),
  validate
];

router.post('/', paymentValidation, paymentController.processPayment);
router.post('/process', paymentValidation, paymentController.processPayment);

// Get Payment List
router.get(
  '/',
  [protect, authorize('staff', 'owner')],
  paymentController.getPayments
);

// Update Payment Status
router.put(
  '/:id/status',
  [protect, authorize('staff', 'owner')],
  paymentController.updatePaymentStatus
);

// Get Payment Details
router.get('/:id', protect, paymentController.getPayment);

module.exports = router;
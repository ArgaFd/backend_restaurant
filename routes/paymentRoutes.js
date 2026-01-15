const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const paymentController = require('../controllers/paymentController');
const verifyMidtrans = require('../middleware/verifyMidtrans');
const idempotencyCache = require('../utils/idempotency');

console.log('[DEBUG] Payment Routes File Loaded!'); // DEBUG LOG

const router = express.Router();

// Webhook Midtrans - Paling atas karena dipanggil dari luar (Midtrans)
router.post(
  '/midtrans-webhook',
  express.json({ type: 'application/json' }),
  verifyMidtrans,
  paymentController.handleMidtransWebhook
);

// Guest Payments - Tanpa auth
router.post('/guest/pay', (req, res, next) => {
  console.log('[PaymentRouter] Hitting POST /guest/pay');
  next();
}, paymentController.createGuestDigitalPayment);



router.post('/guest/manual', (req, res, next) => {
  console.log('[PaymentRouter] Hitting POST /guest/manual');
  next();
}, paymentController.createGuestManualPayment);

// Payment Process (Staff/Owner)
router.post(
  '/process',
  [
    protect,
    authorize('staff', 'owner'),
    body('orderId').isInt().withMessage('ID Pesanan harus berupa angka'),
    body('amount').isFloat({ min: 0 }).withMessage('Jumlah tidak valid'),
    body('paymentMethod').isIn(['cash', 'qris', 'manual']).withMessage('Metode pembayaran tidak valid'),
    validate
  ],
  paymentController.preventReplay,
  paymentController.validatePaymentAmount,
  paymentController.processPayment
);

// Get Payment List
router.get(
  '/',
  (req, res, next) => {
    console.log('[PaymentRouter] MATCHED GET /'); // DEBUG LOG
    next();
  },
  [protect, authorize('staff', 'owner')],
  paymentController.getPayments
);

// Update Payment Status (for manual confirmation)
router.put(
  '/:id/status',
  [protect, authorize('staff', 'owner')],
  paymentController.updatePaymentStatus
);

// Get Payment Details
// WARN: This parameterized route can capture other paths if not careful.
// Ensure specific routes are defined BEFORE this.
router.get('/:id', protect, paymentController.getPayment);

// Debug: Log if a request falls through
router.use((req, res) => {
  console.log(`[PaymentRouter] Unhandled request: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: 'Endpoint pembayaran tidak ditemukan' });
});

module.exports = router;
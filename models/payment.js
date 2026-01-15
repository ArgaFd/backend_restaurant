const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    orderId: { type: Number, required: true, index: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    provider: { type: String, default: null },
    providerRef: { type: String, default: null, index: true },
    status: { type: String, default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', PaymentSchema);

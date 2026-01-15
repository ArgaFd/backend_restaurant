const mongoose = require('mongoose');

const SalesStatSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    totalRevenue: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalPaidPayments: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SalesStat', SalesStatSchema);

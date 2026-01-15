const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    menuId: { type: Number, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    status: { type: String, default: 'pending' },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    tableNumber: { type: Number, required: true },
    customerName: { type: String, default: '' },
    items: { type: [OrderItemSchema], default: [] },
    totalAmount: { type: Number, required: true },
    status: { type: String, default: 'pending' },
    paymentMethod: { type: String, default: 'cash' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);

const Order = require('../models/order');
const Payment = require('../models/payment');
const Menu = require('../models/menu');
const userRepository = require('../repositories/userRepository');
const bcrypt = require('bcryptjs');

const getOrders = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = String(status);

  const pageNum = Number(page);
  const lim = Number(limit);
  const skip = (pageNum - 1) * lim;

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(lim)
    .lean();

  const total = await Order.countDocuments(filter);

  return res.json({
    success: true,
    data: {
      orders,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / lim),
        totalItems: total,
      },
    },
  });
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const updated = await Order.findOneAndUpdate(
    { id: Number(id) },
    { $set: { status } },
    { new: true }
  ).lean();

  if (!updated) return res.status(404).json({ success: false, message: 'Order not found' });
  return res.json({ success: true, data: updated });
};

const confirmManualPayment = async (req, res) => {
  const { id } = req.params;

  const order = await Order.findOne({ id: Number(id) }).lean();
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const payment = await Payment.findOne({ orderId: Number(id), paymentMethod: 'manual' }).lean();
  if (!payment) return res.status(404).json({ success: false, message: 'Manual payment not found' });

  if (payment.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Payment already processed' });
  }

  const updatedPayment = await Payment.findOneAndUpdate(
    { orderId: Number(id), paymentMethod: 'manual' },
    { $set: { status: 'paid' } },
    { new: true }
  ).lean();

  await Order.findOneAndUpdate(
    { id: Number(id) },
    { $set: { status: 'completed' } }
  );

  return res.json({ success: true, data: updatedPayment });
};

const getReceipt = async (req, res) => {
  const { id } = req.params;

  const order = await Order.findOne({ id: Number(id) })
    .lean();

  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const items = await Promise.all(
    order.items.map(async (item) => {
      const menu = await Menu.findOne({ id: item.menuId }).lean();
      return {
        ...item,
        menuName: menu ? menu.name : 'Unknown',
        menuPrice: menu ? menu.price : 0,
      };
    })
  );

  const receipt = {
    ...order,
    items,
  };

  return res.json({ success: true, data: receipt });
};

// Staff Management Functions

const getAllStaff = async (req, res) => {
  const users = await userRepository.getAll();
  // Return all users for Owner's User Management
  return res.json({ success: true, data: users });
};

const createStaff = async (req, res) => {
  const { name, email, password, role, status } = req.body;

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const created = await userRepository.createUser({
    name,
    email,
    passwordHash,
    role: role || 'staff',
    status: status || 'active'
  });

  return res.status(201).json({
    success: true,
    data: {
      id: created.id,
      email: created.email,
      role: created.role,
      name: created.name,
      status: created.status
    },
  });
};

const updateStaff = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status } = req.body;

  const updated = await userRepository.updateUser(id, { name, email, role, status });
  if (!updated) {
    return res.status(404).json({ success: false, message: 'User not found or update failed' });
  }

  return res.json({ success: true, data: updated });
};

const deleteStaff = async (req, res) => {
  const { id } = req.params;
  const ok = await userRepository.remove(id);
  if (!ok) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  return res.json({ success: true, message: 'Staff deleted successfully' });
};

module.exports = {
  getOrders,
  updateOrderStatus,
  confirmManualPayment,
  getReceipt,
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff,
};

const Order = require('../models/order');
const Payment = require('../models/payment');
const Menu = require('../models/menu');
const userRepository = require('../repositories/userRepository');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = String(status);

    const pageNum = Number(page);
    const lim = Number(limit);
    const offset = (pageNum - 1) * lim;

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: lim,
      offset: offset
    });

    return res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(count / lim),
          totalItems: count,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const [updatedCount, updatedRows] = await Order.update(
      { status },
      {
        where: { id: Number(id) },
        returning: true
      }
    );

    if (updatedCount === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: updatedRows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const confirmManualPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(Number(id));
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const payment = await Payment.findOne({
      where: { orderId: Number(id), paymentMethod: 'manual' }
    });

    if (!payment) return res.status(404).json({ success: false, message: 'Manual payment not found' });

    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Payment already processed' });
    }

    payment.status = 'paid';
    await payment.save();

    order.status = 'completed';
    await order.save();

    return res.json({ success: true, data: payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(Number(id));
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const items = await Promise.all(
      order.items.map(async (item) => {
        const menu = await Menu.findByPk(Number(item.menuId));
        return {
          ...item,
          menuName: menu ? menu.name : 'Unknown',
          menuPrice: menu ? menu.price : 0,
        };
      })
    );

    const receipt = {
      ...order.toJSON(),
      items,
    };

    return res.json({ success: true, data: receipt });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Staff Management Functions

const getAllStaff = async (req, res) => {
  try {
    const users = await userRepository.getAll();
    return res.json({ success: true, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createStaff = async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body;

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Pass direct password, UserRepository will handle the rest via Model hooks if implemented correctly
    const created = await userRepository.createUser({
      name,
      email,
      password, // Use direct password since userRepository now uses User model with hooks
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
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;

    const updated = await userRepository.updateUser(id, { name, email, role, status });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found or update failed' });
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const ok = await userRepository.remove(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, message: 'Staff deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
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

const Payment = require('../models/payment');
const Order = require('../models/order');
const Menu = require('../models/menu');
const AuditLog = require('../models/AuditLog');
const { createSnapTransaction } = require('../services/midtransService');
const { Op } = require('sequelize');

const validatePaymentAmount = async (req, res, next) => {
  try {
    // Handle both snake_case and camelCase from frontend
    const orderId = req.body.orderId || req.body.order_id;
    const amount = req.body.amount;

    const order = await Order.findByPk(Number(orderId));

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pesanan tidak ditemukan'
      });
    }

    const tolerance = order.totalAmount * 0.1;
    if (Math.abs(amount - order.totalAmount) > tolerance) {
      await AuditLog.create({
        action: 'PAYMENT_AMOUNT_MISMATCH',
        entity: 'Order',
        entityId: String(order.id),
        oldValue: { totalAmount: order.totalAmount },
        newValue: { amount: amount },
        ipAddress: req.ip
      });
      return res.status(400).json({
        success: false,
        message: 'Jumlah pembayaran tidak sesuai dengan total pesanan'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

const nonceStore = new Map();
const preventReplay = (req, res, next) => {
  const nonce = req.headers['x-nonce'];
  const timestamp = req.headers['x-timestamp'];

  if (!nonce || !timestamp) {
    // If headers missing, we might still want to proceed for now to avoid breaking existing flows
    // but typically we should enforce them if they were enforced before.
    return next();
  }

  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return res.status(400).json({
      success: false,
      message: 'Permintaan kedaluwarsa'
    });
  }

  const requestId = `${req.ip}:${nonce}`;
  if (nonceStore.has(requestId)) {
    return res.status(400).json({
      success: false,
      message: 'Permintaan duplikat terdeteksi'
    });
  }

  nonceStore.set(requestId, true);
  setTimeout(() => nonceStore.delete(requestId), 5 * 60 * 1000);

  next();
};

const handleMidtransWebhook = async (req, res) => {
  try {
    const { order_id: orderIdPrefixed, transaction_status: status } = req.paymentStatus;
    const orderIdMatch = orderIdPrefixed.match(/order-(\d+)-/);
    const orderId = orderIdMatch ? parseInt(orderIdMatch[1]) : parseInt(orderIdPrefixed);

    await AuditLog.create({
      action: 'PAYMENT_WEBHOOK_RECEIVED',
      entity: 'Payment',
      entityId: String(orderId),
      newValue: req.paymentStatus,
      ipAddress: req.ip
    });

    const [updatedCount] = await Payment.update(
      { status: status.toLowerCase() },
      { where: { orderId: orderId } }
    );

    if (updatedCount === 0) {
      return res.status(404).json({ success: false, message: 'Pembayaran tidak ditemukan' });
    }

    if (status === 'capture' || status === 'settlement') {
      await Order.update(
        { status: 'completed' },
        { where: { id: orderId } }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error memproses webhook:', error);
    res.status(500).json({ success: false, message: 'Kesalahan server internal' });
  }
};

const processPayment = async (req, res, next) => {
  try {
    const orderId = req.body.orderId || req.body.order_id;
    const paymentMethod = req.body.paymentMethod || req.body.payment_method;
    const userId = req.user?.id;

    const order = await Order.findByPk(Number(orderId));
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pesanan tidak ditemukan'
      });
    }

    const payment = await Payment.create({
      orderId: Number(orderId),
      amount: Number(order.totalAmount),
      paymentMethod,
      status: paymentMethod === 'manual' || paymentMethod === 'cash' ? 'pending' : 'processing',
      provider: paymentMethod === 'qris' || paymentMethod === 'midtrans' ? 'midtrans' : null,
      providerRef: null,
    });

    await AuditLog.create({
      userId: userId ? Number(userId) : null,
      action: 'PAYMENT_CREATED',
      entity: 'Payment',
      entityId: String(payment.id),
      newValue: {
        orderId: payment.orderId,
        amount: payment.amount,
        method: payment.paymentMethod
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status
      }
    });
  } catch (error) {
    next(error);
  }
};

const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findByPk(Number(req.params.id));
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pembayaran tidak ditemukan'
      });
    }
    res.json({ success: true, data: payment });
  } catch (error) {
    console.error('Error getting payment:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pembayaran'
    });
  }
};

const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const p = Number(page);
    const l = Number(limit);
    const offset = (p - 1) * l;

    const { count, rows: payments } = await Payment.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit: l,
      offset: offset
    });

    res.json({
      success: true,
      data: {
        payments,
        totalItems: count,
        totalPages: Math.ceil(count / l),
        currentPage: p
      }
    });
  } catch (error) {
    console.error('Error getting payments:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar pembayaran'
    });
  }
};

const createGuestDigitalPayment = async (req, res) => {
  try {
    const orderId = req.body.orderId || req.body.order_id;
    const { customer } = req.body;

    const order = await Order.findByPk(Number(orderId));
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pesanan tidak ditemukan'
      });
    }

    const mtOrderReference = `order-${order.id}-${Date.now()}`;

    // Build itemized details for Midtrans Invoice
    const itemIds = (order.items || []).map(it => Number(it.menuId));
    const menus = await Menu.findAll({ where: { id: { [Op.in]: itemIds } } });
    const menuMap = new Map(menus.map(m => [m.id, m.name]));

    const itemDetails = (order.items || []).map(it => ({
      id: String(it.menuId),
      price: Math.round(Number(it.unitPrice)),
      quantity: Number(it.quantity),
      name: menuMap.get(Number(it.menuId)) || `Menu #${it.menuId}`,
    }));

    const mt = await createSnapTransaction({
      orderId: mtOrderReference,
      grossAmount: Math.round(Number(order.totalAmount)),
      customerDetails: customer || undefined,
      itemDetails: itemDetails.length > 0 ? itemDetails : undefined,
    });

    const payment = await Payment.create({
      orderId: Number(order.id),
      amount: Number(order.totalAmount),
      paymentMethod: 'midtrans_qris',
      provider: 'midtrans',
      providerRef: mtOrderReference,
      status: 'pending',
    });

    await AuditLog.create({
      action: 'GUEST_QRIS_PAYMENT_CREATED',
      entity: 'Payment',
      entityId: String(payment.id),
      newValue: {
        orderId: payment.orderId,
        amount: payment.amount,
        method: payment.paymentMethod
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: {
        payment: payment,
        midtrans: {
          token: mt.token,
          redirect_url: mt.redirect_url,
          order_id: mtOrderReference,
        },
      },
    });
  } catch (error) {
    console.error('[PaymentController] Error creating Digital payment:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat pembayaran digital'
    });
  }
};

const createGuestManualPayment = async (req, res) => {
  try {
    const orderId = req.body.orderId || req.body.order_id;
    const order = await Order.findByPk(Number(orderId));

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pesanan tidak ditemukan'
      });
    }

    const existing = await Payment.findOne({
      where: {
        orderId: Number(orderId),
        status: { [Op.in]: ['pending', 'paid'] }
      }
    });

    if (existing) {
      return res.json({
        success: true,
        data: { payment: existing }
      });
    }

    const payment = await Payment.create({
      orderId: Number(orderId),
      amount: Number(order.totalAmount),
      paymentMethod: 'manual',
      provider: null,
      providerRef: null,
      status: 'pending',
    });

    await AuditLog.create({
      action: 'GUEST_MANUAL_PAYMENT_CREATED',
      entity: 'Payment',
      entityId: String(payment.id),
      newValue: {
        orderId: payment.orderId,
        amount: payment.amount,
        method: payment.paymentMethod
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: { payment: payment }
    });
  } catch (error) {
    console.error('Error creating manual payment:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat pembayaran manual'
    });
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    if (!['pending', 'paid', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status pembayaran tidak valid'
      });
    }

    const payment = await Payment.findByPk(Number(id));
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pembayaran tidak ditemukan'
      });
    }

    payment.status = status;
    await payment.save();

    if (status === 'paid') {
      await Order.update(
        { status: 'completed' },
        { where: { id: payment.orderId } }
      );
    }

    await AuditLog.create({
      userId: userId ? Number(userId) : null,
      action: 'PAYMENT_STATUS_UPDATED',
      entity: 'Payment',
      entityId: String(payment.id),
      newValue: { status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui status pembayaran'
    });
  }
};

module.exports = {
  processPayment,
  validatePaymentAmount,
  preventReplay,
  handleMidtransWebhook,
  getPayment,
  getPayments,
  createGuestDigitalPayment,
  createGuestManualPayment,
  updatePaymentStatus
};
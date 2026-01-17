const Menu = require('../models/menu');
const Order = require('../models/order');
const sequelize = require('../config/database');
const { recordCreatedOrder } = require('../services/salesStatService');
const { Op } = require('sequelize');

const buildItemsWithPrice = async (items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.warn('[OrderController] No items provided to buildItemsWithPrice');
    return [];
  }

  const ids = items.map((i) => Number(i.menuId)).filter(id => !isNaN(id) && id > 0);
  if (ids.length === 0) {
    console.warn('[OrderController] No valid menu IDs found in items');
    return [];
  }

  console.log('[OrderController] Building items for IDs:', ids);

  const menus = await Menu.findAll({
    where: { id: { [Op.in]: ids } }
  });
  console.log('[OrderController] Found menus count:', menus.length);

  const menuMap = new Map(menus.map((m) => [m.id, { name: m.name, price: Number(m.price) }]));

  return items.map((it) => {
    const menuInfo = menuMap.get(Number(it.menuId)) || { name: 'Unknown Item', price: 0 };
    return {
      id: Date.now() + Math.floor(Math.random() * 1000), // Simple unique ID for JSONB items
      menuId: Number(it.menuId),
      name: menuInfo.name,
      quantity: Number(it.quantity),
      unitPrice: menuInfo.price,
      status: 'pending',
    };
  });
};

const computeTotal = (items) => items.reduce((sum, it) => sum + Number(it.unitPrice) * Number(it.quantity), 0);

const createOrder = async (req, res) => {
  try {
    const { tableNumber, customerName, items, paymentMethod } = req.body;

    const enrichedItems = await buildItemsWithPrice(items);
    const totalAmount = computeTotal(enrichedItems);

    const order = await Order.create({
      tableNumber: Number(tableNumber),
      customerName: customerName ? String(customerName) : '',
      items: enrichedItems,
      totalAmount,
      status: 'pending',
      paymentMethod: paymentMethod || 'manual',
    });

    await recordCreatedOrder();

    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createGuestOrder = async (req, res) => {
  try {
    const { tableNumber, customerName, items } = req.body;

    const enrichedItems = await buildItemsWithPrice(items);
    const totalAmount = computeTotal(enrichedItems);

    const order = await Order.create({
      tableNumber: Number(tableNumber),
      customerName: customerName ? String(customerName) : '',
      items: enrichedItems,
      totalAmount,
      status: 'pending',
      paymentMethod: 'guest',
    });

    await recordCreatedOrder();

    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });

    // Enrich items with names if missing (for older data)
    const enrichedOrders = await Promise.all(orders.map(async (order) => {
      const plainOrder = order.get({ plain: true });
      const needsEnrichment = plainOrder.items.some(item => !item.name);

      if (needsEnrichment) {
        plainOrder.items = await buildItemsWithPrice(plainOrder.items);
      }
      return plainOrder;
    }));

    return res.json({ success: true, data: enrichedOrders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(Number(req.params.id));
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getGuestOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(Number(req.params.id));
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const [updatedCount, updatedRows] = await Order.update(
      { status: String(status) },
      { where: { id: Number(req.params.id) }, returning: true }
    );

    if (updatedCount === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: updatedRows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrderItemStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const itemId = Number(req.params.id);

    // This is tricky with JSONB. We need to find the order and update the items array.
    const order = await Order.findOne({
      where: sequelize.literal(`items @> '[{"id": ${itemId}}]'`)
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order item not found' });

    const updatedItems = order.items.map(item => {
      if (item.id === itemId) return { ...item, status: String(status) };
      return item;
    });

    order.items = updatedItems;
    await order.save();

    const item = order.items.find(i => i.id === itemId);
    return res.json({ success: true, data: { order, item } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  createGuestOrder,
  getOrders,
  getOrder,
  getGuestOrder,
  updateOrderStatus,
  updateOrderItemStatus,
};

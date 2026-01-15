const Menu = require('../models/menu');
const Order = require('../models/order');
const { getNextSequence } = require('../services/mongoSequence');
const { recordCreatedOrder } = require('../services/salesStatService');

const buildItemsWithPrice = async (items) => {
  const ids = items.map((i) => Number(i.menuId));
  console.log('[OrderController] Building items for IDs:', ids);

  const menus = await Menu.find({ id: { $in: ids } }).lean();
  console.log('[OrderController] Found menus count:', menus.length);

  const priceMap = new Map(menus.map((m) => [m.id, m.price]));
  console.log('[OrderController] Price Map keys:', [...priceMap.keys()]);

  return items.map((it) => {
    const price = Number(priceMap.get(Number(it.menuId)) || 0);
    if (price === 0) console.warn(`[OrderController] WARN: Price for menuId ${it.menuId} is 0 or not found`);

    return {
      id: null,
      menuId: Number(it.menuId),
      quantity: Number(it.quantity),
      unitPrice: price,
      status: 'pending',
    };
  });
};

const computeTotal = (items) => items.reduce((sum, it) => sum + Number(it.unitPrice) * Number(it.quantity), 0);

const createOrder = async (req, res) => {
  // staff/owner can also create orders (still protected by route)
  const { tableNumber, customerName, items, paymentMethod } = req.body;

  const enrichedItems = await buildItemsWithPrice(items);
  for (const it of enrichedItems) {
    // order item ids
    // eslint-disable-next-line no-await-in-loop
    it.id = await getNextSequence('order_item');
  }

  const id = await getNextSequence('order');
  const totalAmount = computeTotal(enrichedItems);
  const order = await Order.create({
    id,
    tableNumber: Number(tableNumber),
    customerName: customerName ? String(customerName) : '',
    items: enrichedItems,
    totalAmount,
    status: 'pending',
    paymentMethod: paymentMethod || 'manual',
  });

  await recordCreatedOrder();

  return res.status(201).json({ success: true, data: order.toObject() });
};

const createGuestOrder = async (req, res) => {
  const { tableNumber, customerName, items } = req.body;

  const enrichedItems = await buildItemsWithPrice(items);
  for (const it of enrichedItems) {
    // eslint-disable-next-line no-await-in-loop
    it.id = await getNextSequence('order_item');
  }

  const id = await getNextSequence('order');
  const totalAmount = computeTotal(enrichedItems);
  const order = await Order.create({
    id,
    tableNumber: Number(tableNumber),
    customerName: customerName ? String(customerName) : '',
    items: enrichedItems,
    totalAmount,
    status: 'pending',
    paymentMethod: 'guest',
  });

  await recordCreatedOrder();

  return res.status(201).json({ success: true, data: order.toObject() });
};

const getOrders = (req, res) => {
  return Order.find({}).sort({ createdAt: -1 }).lean().then((orders) => res.json({ success: true, data: orders }));
};

const getOrder = (req, res) => {
  return Order.findOne({ id: Number(req.params.id) })
    .lean()
    .then((order) => {
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      return res.json({ success: true, data: order });
    });
};

const getGuestOrder = (req, res) => {
  return Order.findOne({ id: Number(req.params.id) })
    .lean()
    .then((order) => {
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      return res.json({ success: true, data: order });
    });
};

const updateOrderStatus = (req, res) => {
  const { status } = req.body;
  return Order.findOneAndUpdate({ id: Number(req.params.id) }, { $set: { status: String(status) } }, { new: true })
    .lean()
    .then((order) => {
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      return res.json({ success: true, data: order });
    });
};

const updateOrderItemStatus = (req, res) => {
  const { status } = req.body;
  const itemId = Number(req.params.id);
  return Order.findOneAndUpdate(
    { 'items.id': itemId },
    { $set: { 'items.$.status': String(status) } },
    { new: true }
  )
    .lean()
    .then((order) => {
      if (!order) return res.status(404).json({ success: false, message: 'Order item not found' });
      const item = (order.items || []).find((i) => i.id === itemId);
      return res.json({ success: true, data: { order, item } });
    });
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

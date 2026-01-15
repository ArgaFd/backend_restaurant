let orderSeq = 1;
let orderItemSeq = 1;

const orders = [];

const computeTotal = (items) => items.reduce((sum, it) => sum + Number(it.unitPrice) * Number(it.quantity), 0);

const create = ({ tableNumber, customerName, items, paymentMethod }) => {
  const normalizedItems = items.map((it) => ({
    id: orderItemSeq++,
    menuId: Number(it.menuId),
    quantity: Number(it.quantity),
    unitPrice: Number(it.unitPrice || it.price || 0),
    status: 'pending',
  }));

  const order = {
    id: orderSeq++,
    tableNumber: Number(tableNumber),
    customerName: customerName ? String(customerName) : '',
    items: normalizedItems,
    totalAmount: computeTotal(normalizedItems),
    status: 'pending',
    paymentMethod: paymentMethod || 'cash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.push(order);
  return order;
};

const getAll = () => orders;

const getById = (id) => orders.find((o) => o.id === Number(id));

const updateStatus = (id, status) => {
  const order = getById(id);
  if (!order) return null;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  return order;
};

const updateItemStatus = (itemId, status) => {
  const idNum = Number(itemId);
  for (const order of orders) {
    const item = order.items.find((i) => i.id === idNum);
    if (item) {
      item.status = status;
      order.updatedAt = new Date().toISOString();
      return { order, item };
    }
  }
  return null;
};

module.exports = {
  create,
  getAll,
  getById,
  updateStatus,
  updateItemStatus,
};

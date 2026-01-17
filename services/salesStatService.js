const SalesStat = require('../models/salesStat');

const toDateKey = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const recordPaidPayment = async (amount) => {
  const date = toDateKey();
  const [stat, created] = await SalesStat.findOrCreate({
    where: { date },
    defaults: { totalRevenue: 0, totalPaidPayments: 0, totalOrders: 0 }
  });

  await stat.increment({
    totalRevenue: Number(amount) || 0,
    totalPaidPayments: 1
  });
};

const recordCreatedOrder = async () => {
  const date = toDateKey();
  const [stat, created] = await SalesStat.findOrCreate({
    where: { date },
    defaults: { totalRevenue: 0, totalPaidPayments: 0, totalOrders: 0 }
  });

  await stat.increment('totalOrders', { by: 1 });
};

module.exports = {
  recordPaidPayment,
  recordCreatedOrder,
};

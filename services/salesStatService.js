const SalesStat = require('../models/salesStat');

const toDateKey = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const recordPaidPayment = async (amount) => {
  const date = toDateKey();
  await SalesStat.findOneAndUpdate(
    { date },
    {
      $inc: {
        totalRevenue: Number(amount) || 0,
        totalPaidPayments: 1,
      },
    },
    { upsert: true, new: true }
  );
};

const recordCreatedOrder = async () => {
  const date = toDateKey();
  await SalesStat.findOneAndUpdate(
    { date },
    {
      $inc: {
        totalOrders: 1,
      },
    },
    { upsert: true, new: true }
  );
};

module.exports = {
  recordPaidPayment,
  recordCreatedOrder,
};

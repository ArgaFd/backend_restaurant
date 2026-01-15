const Order = require('../models/order');
const Payment = require('../models/payment');
const Menu = require('../models/menu');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, format } = require('date-fns');

const getSalesReport = async (req, res) => {
  try {
    const { period = 'daily', start, end } = req.query;
    console.log(`[OwnerController] Generating report: period=${period}, start=${start}, end=${end}`);

    let startDate, endDate;
    const now = new Date();

    // Set date range based on period
    try {
      switch (period) {
        case 'daily':
          startDate = startOfDay(start ? parseISO(String(start)) : now);
          endDate = endOfDay(start ? parseISO(String(start)) : now);
          break;
        case 'weekly':
          startDate = startOfWeek(start ? parseISO(String(start)) : now, { weekStartsOn: 1 });
          endDate = endOfWeek(start ? parseISO(String(start)) : now, { weekStartsOn: 1 });
          break;
        case 'monthly':
          startDate = startOfMonth(start ? parseISO(String(start)) : now);
          endDate = endOfMonth(start ? parseISO(String(start)) : now);
          break;
        case 'custom':
          if (!start || !end) {
            return res.status(400).json({ success: false, message: 'Start and end dates are required for custom range' });
          }
          startDate = startOfDay(parseISO(String(start)));
          endDate = endOfDay(parseISO(String(end)));
          break;
        default:
          startDate = startOfDay(now);
          endDate = endOfDay(now);
      }
    } catch (dateError) {
      console.warn('[OwnerController] Date parsing error, falling back to today', dateError);
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    }

    console.log(`[OwnerController] Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get all orders in the date range that are completed
    // We remove the strict payment.status: 'paid' join to be more inclusive of completed orders
    const orders = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'payments',
          localField: 'id',
          foreignField: 'orderId',
          as: 'paymentInfo'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'daily' ? '%Y-%m-%d' :
                period === 'weekly' ? '%Y-%U' :
                  '%Y-%m',
              date: '$createdAt'
            }
          },
          date: { $first: '$createdAt' },
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Get top selling items
    const topSellingItems = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuId',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 }
    ]);

    // Calculate summary
    const summary = {
      totalRevenue: orders.reduce((sum, p) => sum + (p.totalRevenue || 0), 0),
      totalOrders: orders.reduce((sum, p) => sum + (p.orderCount || 0), 0),
      averageOrderValue: 0,
      startDate,
      endDate,
      period
    };

    summary.averageOrderValue = summary.totalOrders > 0
      ? Math.round(summary.totalRevenue / summary.totalOrders)
      : 0;

    // Format response
    const formattedData = orders.map(p => ({
      period: p._id,
      date: p.date,
      revenue: p.totalRevenue,
      orderCount: p.orderCount,
      averageOrderValue: Math.round(p.totalRevenue / p.orderCount) || 0
    }));

    console.log(`[OwnerController] Report completed: ${summary.totalOrders} orders, Total Rp ${summary.totalRevenue}`);

    res.json({
      success: true,
      data: {
        summary,
        periods: formattedData,
        topSellingItems
      }
    });

  } catch (error) {
    console.error('[OwnerController] Fatal error generating sales report:', error);
    res.status(500).json({ success: false, message: 'Gagal menghasilkan laporan', error: error.message });
  }
};

module.exports = {
  getSalesReport
};

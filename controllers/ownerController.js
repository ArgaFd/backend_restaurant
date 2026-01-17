const Order = require('../models/order');
const Payment = require('../models/payment');
const Menu = require('../models/menu');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, format } = require('date-fns');

const getSalesReport = async (req, res) => {
  try {
    const { period = 'daily', start, end } = req.query;
    console.log(`[OwnerController] Generating report: period=${period}, start=${start}, end=${end}`);

    let startDate, endDate;
    const now = new Date();

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

    // PostgreSQL specific aggregation for periods
    const dateFormat = period === 'daily' ? 'YYYY-MM-DD' :
      period === 'weekly' ? 'IYYY-IW' : // ISO Year-Week
        'YYYY-MM';

    const orderStats = await Order.findAll({
      attributes: [
        [sequelize.fn('to_char', sequelize.col('createdAt'), dateFormat), 'periodLabel'],
        [sequelize.fn('MIN', sequelize.col('createdAt')), 'minDate'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount']
      ],
      where: {
        status: { [Op.in]: ['accepted', 'preparing', 'ready', 'completed'] },
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      group: [sequelize.fn('to_char', sequelize.col('createdAt'), dateFormat)],
      order: [[sequelize.fn('MIN', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Top Selling Items from JSONB
    // We use a raw query because unnesting JSONB is much cleaner in SQL
    const topSellingItems = await sequelize.query(`
      SELECT 
        jsonb_extract_path_text(item, 'menuId') as "menuId",
        COUNT(*) as quantity_raw,
        SUM((jsonb_extract_path_text(item, 'quantity'))::numeric) as quantity,
        SUM((jsonb_extract_path_text(item, 'quantity'))::numeric * (jsonb_extract_path_text(item, 'unitPrice'))::numeric) as "totalRevenue"
      FROM "Orders", jsonb_array_elements("items") as item
      WHERE status IN ('accepted', 'preparing', 'ready', 'completed') AND "createdAt" >= :startDate AND "createdAt" <= :endDate
      GROUP BY "menuId"
      ORDER BY quantity DESC
      LIMIT 10
    `, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    // We need to fetch item names since they aren't in the Orders items JSONB or might be outdated
    const menuIds = topSellingItems.map(it => Number(it.menuId));
    const menus = await Menu.findAll({
      where: { id: { [Op.in]: menuIds } },
      attributes: ['id', 'name'],
      raw: true
    });
    const menuNameMap = new Map(menus.map(m => [m.id, m.name]));

    const enrichedTopItems = topSellingItems.map(it => ({
      _id: Number(it.menuId),
      name: menuNameMap.get(Number(it.menuId)) || 'Unknown Item',
      quantity: Number(it.quantity),
      totalRevenue: Number(it.totalRevenue)
    }));

    // Calculate summary
    const summary = {
      totalRevenue: orderStats.reduce((sum, p) => sum + Number(p.totalRevenue || 0), 0),
      totalOrders: orderStats.reduce((sum, p) => sum + Number(p.orderCount || 0), 0),
      averageOrderValue: 0,
      startDate,
      endDate,
      period
    };

    summary.averageOrderValue = summary.totalOrders > 0
      ? Math.round(summary.totalRevenue / summary.totalOrders)
      : 0;

    // Format response
    const formattedPeriods = orderStats.map(p => ({
      period: p.periodLabel,
      date: p.minDate,
      revenue: Number(p.totalRevenue),
      orderCount: Number(p.orderCount),
      averageOrderValue: Math.round(Number(p.totalRevenue) / Number(p.orderCount)) || 0
    }));

    console.log(`[OwnerController] Report completed: ${summary.totalOrders} orders, Total Rp ${summary.totalRevenue}`);

    res.json({
      success: true,
      data: {
        summary,
        periods: formattedPeriods,
        topSellingItems: enrichedTopItems
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

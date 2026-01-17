const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SalesStat = sequelize.define('SalesStat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  totalRevenue: {
    type: DataTypes.DECIMAL(14, 2),
    defaultValue: 0
  },
  totalOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalPaidPayments: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true
});

module.exports = SalesStat;

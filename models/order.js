const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tableNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  customerName: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  items: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.STRING,
    defaultValue: 'cash'
  }
}, {
  timestamps: true
});

module.exports = Order;

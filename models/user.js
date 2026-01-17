const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password_hash' // Map to the existing column name
  },
  role: {
    type: DataTypes.STRING, // Use STRING to match the 'text' type in existing table
    defaultValue: 'staff'
  },
  status: {
    type: DataTypes.STRING, // Use STRING to match the 'text' type in existing table
    defaultValue: 'active'
  },
  reset_token: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reset_token_expires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users', // Use the existing table name
  timestamps: true,
  createdAt: 'created_at', // Map to existing column names
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Method to compare password
User.prototype.comparePassword = async function (candidatePassword) {
  // Be careful here: candidatePassword vs this.password (which is password_hash)
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;

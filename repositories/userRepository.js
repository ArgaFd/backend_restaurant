const User = require('../models/user');
const { Op } = require('sequelize');

const findByEmail = async (email) => {
  return await User.findOne({
    where: { email: email.toLowerCase() }
  });
};

const findById = async (id) => {
  return await User.findByPk(id);
};

const createUser = async ({ name, email, password, role, status }) => {
  return await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
    status: status || 'active'
  });
};

const getAll = async () => {
  return await User.findAll({
    order: [['id', 'ASC']]
  });
};

const ownerExists = async () => {
  const count = await User.count({
    where: { role: 'owner' }
  });
  return count > 0;
};

const updateRole = async (id, role) => {
  const user = await User.findByPk(id);
  if (!user) return null;
  user.role = role;
  await user.save();
  return user;
};

const updateUser = async (id, data) => {
  const user = await User.findByPk(id);
  if (!user) return null;

  if (data.name) user.name = data.name;
  if (data.email) user.email = data.email.toLowerCase();
  if (data.role) user.role = data.role;
  if (data.status) user.status = data.status;

  await user.save();
  return user;
};

const findByResetToken = async (token) => {
  return await User.findOne({
    where: {
      reset_token: token,
      reset_token_expires: { [Op.gt]: new Date() }
    }
  });
};

const remove = async (id) => {
  const deleted = await User.destroy({
    where: { id }
  });
  return deleted > 0;
};

module.exports = {
  findByEmail,
  findById,
  createUser,
  getAll,
  ownerExists,
  updateRole,
  updateUser,
  findByResetToken,
  remove,
};

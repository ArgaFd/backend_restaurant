const bcrypt = require('bcryptjs');

let seq = 1;
const users = [];

const getAll = () => users.map((u) => ({ ...u, passwordHash: undefined }));

const getById = (id) => users.find((u) => u.id === Number(id));

const getByEmail = (email) => users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());

const create = async ({ name, email, password, role }) => {
  const user = {
    id: seq++,
    name: String(name),
    email: String(email).toLowerCase(),
    role: role || 'cashier',
    passwordHash: await bcrypt.hash(String(password), 10),
  };

  users.push(user);
  return { id: user.id, name: user.name, email: user.email, role: user.role };
};

const updateRole = (id, role) => {
  const user = getById(id);
  if (!user) return null;
  user.role = role;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
};

const remove = (id) => {
  const idx = users.findIndex((u) => u.id === Number(id));
  if (idx === -1) return false;
  users.splice(idx, 1);
  return true;
};

const verifyPassword = async (user, password) => bcrypt.compare(String(password), user.passwordHash);

module.exports = {
  getAll,
  getById,
  getByEmail,
  create,
  updateRole,
  remove,
  verifyPassword,
};

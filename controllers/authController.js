const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const userRepository = require('../repositories/userRepository');

const signToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error('JWT_SECRET is required');
    err.statusCode = 500;
    err.expose = true;
    throw err;
  }

  return jwt.sign({ sub: userId }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

const createStaffUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const created = await userRepository.createUser({
      name,
      email,
      passwordHash,
      role: 'staff',
    });

    return res.status(201).json({
      success: true,
      data: { id: created.id, email: created.email, role: created.role, name: created.name },
    });
  } catch (error) {
    console.error('Create Staff Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hasOwner = await userRepository.ownerExists();
    if (hasOwner) {
      return res.status(403).json({ success: false, message: 'Registration is closed. Owner must create staff accounts.' });
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const created = await userRepository.createUser({
      name,
      email,
      passwordHash,
      role: 'owner',
    });

    const token = signToken(created.id);

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: created.id, email: created.email, role: created.role, name: created.name },
      },
    });
  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user.id);

    return res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role, name: user.name },
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

const getMe = (req, res) => {
  return res.json({ success: true, data: req.user });
};

const getUsers = (req, res) => {
  return userRepository
    .getAll()
    .then((users) => res.json({ success: true, data: { users } }));
};

const updateUserRole = (req, res) => {
  const userId = Number(req.params.id);
  const { role } = req.body;

  return userRepository.updateRole(userId, role).then((updated) => {
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: updated });
  });
};

const deleteUser = (req, res) => {
  const userId = Number(req.params.id);

  return userRepository.remove(userId).then((ok) => {
    if (!ok) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: { deleted: true } });
  });
};

module.exports = {
  register,
  login,
  getMe,
  getUsers,
  createStaffUser,
  updateUserRole,
  deleteUser,
};

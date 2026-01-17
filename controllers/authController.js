const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const crypto = require('crypto');
const emailService = require('../services/emailService');

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

    // We pass plain password because User model has beforeCreate hook to hash it
    const created = await userRepository.createUser({
      name,
      email,
      password,
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

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Use the comparePassword method defined in User model
    const ok = await user.comparePassword(String(password));
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

const getUsers = async (req, res) => {
  try {
    const users = await userRepository.getAll();
    return res.json({ success: true, data: { users } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    const updated = await userRepository.updateRole(userId, role);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userRepository.findByEmail(email);

    if (!user) {
      // For security, don't reveal if user exists
      return res.json({ success: true, message: 'Jika email terdaftar, instruksi reset akan dikirim.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.reset_token = token;
    user.reset_token_expires = new Date(Date.now() + 3600000); // 1 hour

    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
    await emailService.sendResetPasswordEmail(user.email, resetUrl);

    return res.json({ success: true, message: 'Instruksi reset telah dikirim ke email Anda.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengirim email reset.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await userRepository.findByResetToken(token);

    if (!user) {
      return res.status(400).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa.' });
    }

    user.password = password; // Hook will hash it
    user.reset_token = null;
    user.reset_token_expires = null;

    await user.save();

    return res.json({ success: true, message: 'Kata sandi berhasil diperbarui. Silakan login kembali.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mereset kata sandi.' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    const ok = await userRepository.remove(userId);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  login,
  getMe,
  getUsers,
  createStaffUser,
  updateUserRole,
  deleteUser,
  forgotPassword,
  resetPassword,
};

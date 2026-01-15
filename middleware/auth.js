const jwt = require('jsonwebtoken');

const userRepository = require('../repositories/userRepository');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: 'Server misconfigured' });
    }

    const decoded = jwt.verify(token, secret);
    const user = await userRepository.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  return next();
};

module.exports = {
  protect,
  authorize,
};

const ownerOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (req.user.role !== 'owner') return res.status(403).json({ success: false, message: 'Forbidden' });
  return next();
};

const staffOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (req.user.role !== 'staff') return res.status(403).json({ success: false, message: 'Forbidden' });
  return next();
};

module.exports = { ownerOnly, staffOnly };

const jwt = require('jsonwebtoken');
const { unauthorized } = require('../utils/response');

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return unauthorized(res, 'Access token required.');
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return unauthorized(res, 'Access token expired.');
    return unauthorized(res, 'Invalid access token.');
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return unauthorized(res);
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions.' });
  }
  next();
};

module.exports = { requireAuth, requireRole };

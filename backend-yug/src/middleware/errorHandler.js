const logger = require('../utils/logger');

module.exports = function errorHandler(err, req, res, next) {
  logger.error(err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: (err.issues || err.errors || []).map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({ success: false, error: 'A record with this value already exists.', detail: err.detail });
  }

  if (err.code === '23503') {
    return res.status(400).json({ success: false, error: 'Referenced record does not exist.' });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }

  const status = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  return res.status(status).json({ success: false, error: message });
};

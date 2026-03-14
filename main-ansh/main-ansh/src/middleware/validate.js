import { validationResult } from 'express-validator';

/**
 * Middleware that runs after express-validator chains.
 * Returns 400 with a consistent error shape if validation failed.
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    details,
  });
}

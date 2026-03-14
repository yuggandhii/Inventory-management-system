import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './controller.js';

const router = Router();

// Helpful response when someone visits auth URLs in the browser (GET)
router.get('/login', (req, res) =>
  res.json({
    message: 'Login requires POST with JSON body: { "email", "password" }',
    method: 'POST',
    body: { email: 'string', password: 'string' },
  })
);
router.get('/signup', (req, res) =>
  res.json({
    message: 'Signup requires POST with JSON body: { "email", "password", "name?" }',
    method: 'POST',
    body: { email: 'string', password: 'string', name: 'optional', role: 'optional' },
  })
);

router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').optional().trim(),
    body('role').optional().isIn(['inventory_manager', 'warehouse_staff', 'admin', 'staff']),
  ],
  validate,
  ctrl.signup
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate,
  ctrl.login
);

router.post(
  '/password-reset/request',
  [body('email').isEmail().normalizeEmail()],
  validate,
  ctrl.requestPasswordReset
);

router.post(
  '/password-reset/confirm',
  [
    body('email').isEmail().normalizeEmail(),
    body('code').isLength({ min: 4, max: 8 }),
    body('newPassword').isLength({ min: 6 }),
  ],
  validate,
  ctrl.resetPasswordWithOtp
);

router.get('/me', authenticate, ctrl.getMe);

export const authRoutes = router;

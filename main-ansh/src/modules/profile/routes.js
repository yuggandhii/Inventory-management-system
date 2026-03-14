import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { validate } from '../../middleware/validate.js';

const router = Router();
const SALT_ROUNDS = 10;

router.get('/', (req, res) => {
  res.json({ user: req.user });
});

router.patch(
  '/',
  [
    body('name').optional().trim().notEmpty(),
    body('currentPassword').optional().notEmpty(),
    body('newPassword').optional().isLength({ min: 6 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, currentPassword, newPassword } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (newPassword) {
        if (!currentPassword) return res.status(400).json({ success: false, error: 'Current password required to set new password' });
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        data.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
      }
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data,
        select: { id: true, email: true, name: true, role: true },
      });
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

export const profileRoutes = router;

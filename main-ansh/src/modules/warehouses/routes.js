import { Router } from 'express';
import { body } from 'express-validator';
import { prisma } from '../../lib/prisma.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const list = await prisma.warehouse.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { stockLevels: true } } },
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const wh = await prisma.warehouse.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { stockLevels: true } } },
    });
    if (!wh) return res.status(404).json({ success: false, error: 'Warehouse not found' });
    res.json(wh);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('code').optional().trim(),
    body('address').optional().trim(),
    body('isDefault').optional().isBoolean(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, code, address, isDefault } = req.body;
      if (isDefault) {
        await prisma.warehouse.updateMany({ data: { isDefault: false } });
      }
      const warehouse = await prisma.warehouse.create({
        data: { name, code: code || null, address: address || null, isDefault: !!isDefault },
      });
      res.status(201).json(warehouse);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('code').optional().trim(),
    body('address').optional().trim(),
    body('isDefault').optional().isBoolean(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, code, address, isDefault } = req.body;
      if (isDefault) {
        await prisma.warehouse.updateMany({ where: { id: { not: req.params.id } }, data: { isDefault: false } });
      }
      const warehouse = await prisma.warehouse.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name }),
          ...(code !== undefined && { code }),
          ...(address !== undefined && { address }),
          ...(isDefault !== undefined && { isDefault }),
        },
      });
      res.json(warehouse);
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Warehouse not found' });
      next(err);
    }
  }
);

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.warehouse.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Warehouse not found' });
    next(err);
  }
});

export const warehouseRoutes = router;

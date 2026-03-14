import { Router } from 'express';
import { query } from 'express-validator';
import { prisma } from '../../lib/prisma.js';
import { validate } from '../../middleware/validate.js';
import { getPagination } from '../../utils/pagination.js';

const router = Router();

router.get(
  '/',
  [
    query('productId').optional().isString(),
    query('warehouseId').optional().isString(),
    query('referenceType').optional().isIn(['receipt', 'delivery', 'transfer_in', 'transfer_out', 'adjustment', 'initial']),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req, res, next) => {
    try {
    const { productId, warehouseId, referenceType, from, to } = req.query;
    const { skip, take, page, limit } = getPagination(req.query);

      const where = {};
      if (productId) where.productId = productId;
      if (warehouseId) where.warehouseId = warehouseId;
      if (referenceType) where.referenceType = referenceType;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const [items, total] = await Promise.all([
        prisma.stockMove.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.stockMove.count({ where }),
      ]);

      const productIds = [...new Set(items.map((m) => m.productId))];
      const warehouseIds = [...new Set(items.map((m) => m.warehouseId))];
      const [products, warehouses] = await Promise.all([
        productIds.length ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true } }) : [],
        warehouseIds.length ? prisma.warehouse.findMany({ where: { id: { in: warehouseIds } }, select: { id: true, name: true, code: true } }) : [],
      ]);
      const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
      const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w]));

      const enriched = items.map((m) => ({
        ...m,
        product: productMap[m.productId],
        warehouse: warehouseMap[m.warehouseId],
      }));

      res.json({ items: enriched, total, page, limit });
    } catch (err) {
      next(err);
    }
  }
);

export const moveHistoryRoutes = router;

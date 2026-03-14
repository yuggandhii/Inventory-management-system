import { prisma } from '../../lib/prisma.js';
import { getPagination } from '../../utils/pagination.js';

export async function list(req, res, next) {
  try {
    const { categoryId, warehouseId, sku, lowStock } = req.query;
    const { skip, take, page, limit } = getPagination(req.query);

    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (sku) where.OR = [{ sku: { contains: sku } }, { code: { contains: sku } }];

    if (warehouseId || lowStock === 'true') {
      where.stockLevels = { some: {} };
      if (warehouseId) where.stockLevels.some.warehouseId = warehouseId;
      if (lowStock === 'true') {
        where.OR = [
          { stockLevels: { some: { quantity: { lte: 0 } } } },
          { reorderRule: { reorderPoint: { not: null } } },
        ];
        // Simpler: products that have at least one stock level <= 0 or below reorder point
        where.stockLevels.some = where.stockLevels.some || {};
        // We'll filter in code for reorder point; Prisma doesn't easily do "quantity <= reorderPoint" across relation
      }
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: { select: { id: true, name: true } },
          stockLevels: {
            include: { warehouse: { select: { id: true, name: true, code: true } } },
          },
          reorderRule: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where }),
    ]);

    let result = items;
    if (lowStock === 'true') {
      result = items.filter((p) => {
        const hasZero = p.stockLevels.some((s) => s.quantity <= 0);
        const belowReorder = p.reorderRule && p.stockLevels.some((s) => s.quantity <= p.reorderRule.reorderPoint);
        return hasZero || belowReorder;
      });
    }

    res.json({ items: result, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        stockLevels: { include: { warehouse: true } },
        reorderRule: true,
      },
    });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, sku, code, categoryId, unitOfMeasure, description, initialStock, warehouseId } = req.body;
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) return res.status(400).json({ success: false, error: 'SKU already exists' });

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name,
          sku,
          code: code || null,
          categoryId: categoryId || null,
          unitOfMeasure: unitOfMeasure || 'unit',
          description: description || null,
        },
      });
      if (initialStock != null && Number(initialStock) > 0 && warehouseId) {
        const wh = await tx.warehouse.findUnique({ where: { id: warehouseId } });
        if (wh) {
          await tx.stockLevel.upsert({
            where: {
              productId_warehouseId: { productId: p.id, warehouseId },
            },
            create: { productId: p.id, warehouseId, quantity: Number(initialStock) },
            update: { quantity: { increment: Number(initialStock) } },
          });
          await tx.stockMove.create({
            data: {
              productId: p.id,
              warehouseId,
              quantity: Number(initialStock),
              referenceType: 'initial',
              referenceId: p.id,
            },
          });
        }
      }
      return tx.product.findUnique({
        where: { id: p.id },
        include: { category: true, stockLevels: { include: { warehouse: true } }, reorderRule: true },
      });
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { name, code, categoryId, unitOfMeasure, description } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(code !== undefined && { code }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(unitOfMeasure && { unitOfMeasure }),
        ...(description !== undefined && { description }),
      },
      include: { category: true, stockLevels: { include: { warehouse: true } }, reorderRule: true },
    });
    res.json(product);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Product not found' });
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Product not found' });
    next(err);
  }
}

export async function getStockByLocation(req, res, next) {
  try {
    const levels = await prisma.stockLevel.findMany({
      where: { productId: req.params.id },
      include: { warehouse: true },
    });
    res.json(levels);
  } catch (err) {
    next(err);
  }
}

export async function setReorderRule(req, res, next) {
  try {
    const { minQuantity, maxQuantity, reorderPoint, warehouseId } = req.body;
    const productId = req.params.id;
    const rule = await prisma.productReorderRule.upsert({
      where: { productId },
      create: {
        productId,
        minQuantity: minQuantity ?? 0,
        maxQuantity: maxQuantity ?? null,
        reorderPoint: reorderPoint ?? 0,
        warehouseId: warehouseId || null,
      },
      update: {
        ...(minQuantity !== undefined && { minQuantity }),
        ...(maxQuantity !== undefined && { maxQuantity }),
        ...(reorderPoint !== undefined && { reorderPoint }),
        ...(warehouseId !== undefined && { warehouseId: warehouseId || null }),
      },
      include: { warehouse: true },
    });
    res.json(rule);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Product not found' });
    next(err);
  }
}

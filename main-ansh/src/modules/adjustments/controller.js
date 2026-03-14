import { prisma } from '../../lib/prisma.js';
import { getNextNumber } from '../../utils/docNumber.js';
import { getPagination } from '../../utils/pagination.js';

export async function list(req, res, next) {
  try {
    const { status, warehouseId } = req.query;
    const { skip, take, page, limit } = getPagination(req.query);
    const where = {};
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;

    const [items, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where,
        skip,
        take,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, email: true, name: true } },
          lines: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockAdjustment.count({ where }),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const adj = await prisma.stockAdjustment.findUnique({
      where: { id: req.params.id },
      include: {
        warehouse: true,
        createdBy: { select: { id: true, email: true, name: true } },
        lines: { include: { product: true } },
      },
    });
    if (!adj) return res.status(404).json({ success: false, error: 'Adjustment not found' });
    res.json(adj);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { warehouseId, reason, notes, lines } = req.body;
    const number = await getNextNumber('adjustment');
    const lineData = lines?.length
      ? await Promise.all(
          lines.map(async (l) => {
            const level = await prisma.stockLevel.findUnique({
              where: {
                productId_warehouseId: { productId: l.productId, warehouseId },
              },
            });
            const previous = level?.quantity ?? 0;
            const counted = Number(l.countedQuantity);
            return {
              productId: l.productId,
              countedQuantity: counted,
              previousQuantity: previous,
              difference: counted - previous,
            };
          })
        )
      : [];
    const adjustment = await prisma.stockAdjustment.create({
      data: {
        number,
        warehouseId,
        reason: reason || null,
        notes: notes || null,
        status: 'draft',
        createdById: req.user?.id,
        lines: lineData.length ? { create: lineData } : undefined,
      },
      include: {
        warehouse: true,
        lines: { include: { product: true } },
      },
    });
    res.status(201).json(adjustment);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const adj = await prisma.stockAdjustment.findUnique({ where: { id: req.params.id } });
    if (!adj) return res.status(404).json({ success: false, error: 'Adjustment not found' });
    if (adj.status === 'done' || adj.status === 'canceled') {
      return res.status(400).json({ success: false, error: 'Cannot edit validated or canceled adjustment' });
    }

    const { warehouseId, reason, notes, lines } = req.body;
    const data = {
      ...(warehouseId && { warehouseId }),
      ...(reason !== undefined && { reason }),
      ...(notes !== undefined && { notes }),
    };
    if (lines && Array.isArray(lines)) {
      await prisma.stockAdjustmentLine.deleteMany({ where: { adjustmentId: req.params.id } });
      for (const l of lines) {
        const level = await prisma.stockLevel.findUnique({
          where: {
            productId_warehouseId: { productId: l.productId, warehouseId: adj.warehouseId },
          },
        });
        const previous = level?.quantity ?? 0;
        const counted = Number(l.countedQuantity);
        await prisma.stockAdjustmentLine.create({
          data: {
            adjustmentId: req.params.id,
            productId: l.productId,
            countedQuantity: counted,
            previousQuantity: previous,
            difference: counted - previous,
          },
        });
      }
    }
    const updated = await prisma.stockAdjustment.update({
      where: { id: req.params.id },
      data,
      include: {
        warehouse: true,
        lines: { include: { product: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function validateAdjustment(req, res, next) {
  try {
    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!adjustment) return res.status(404).json({ success: false, error: 'Adjustment not found' });
    if (adjustment.status === 'done') return res.status(400).json({ success: false, error: 'Already validated' });
    if (adjustment.status === 'canceled') return res.status(400).json({ success: false, error: 'Adjustment is canceled' });
    if (!adjustment.lines?.length) return res.status(400).json({ success: false, error: 'Add at least one line' });

    await prisma.$transaction(async (tx) => {
      for (const line of adjustment.lines) {
        const diff = line.difference;
        if (diff === 0) continue;
        await tx.stockLevel.upsert({
          where: {
            productId_warehouseId: { productId: line.productId, warehouseId: adjustment.warehouseId },
          },
          create: {
            productId: line.productId,
            warehouseId: adjustment.warehouseId,
            quantity: line.countedQuantity,
          },
          update: { quantity: line.countedQuantity },
        });
        await tx.stockMove.create({
          data: {
            productId: line.productId,
            warehouseId: adjustment.warehouseId,
            quantity: diff,
            referenceType: 'adjustment',
            referenceId: adjustment.id,
          },
        });
      }
      await tx.stockAdjustment.update({
        where: { id: adjustment.id },
        data: { status: 'done', validatedAt: new Date() },
      });
    });

    const updated = await prisma.stockAdjustment.findUnique({
      where: { id: req.params.id },
      include: { warehouse: true, lines: { include: { product: true } } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function cancel(req, res, next) {
  try {
    const adj = await prisma.stockAdjustment.findUnique({ where: { id: req.params.id } });
    if (!adj) return res.status(404).json({ success: false, error: 'Adjustment not found' });
    if (adj.status === 'done') return res.status(400).json({ success: false, error: 'Cannot cancel validated adjustment' });
    await prisma.stockAdjustment.update({
      where: { id: req.params.id },
      data: { status: 'canceled' },
    });
    res.json({ status: 'canceled' });
  } catch (err) {
    next(err);
  }
}

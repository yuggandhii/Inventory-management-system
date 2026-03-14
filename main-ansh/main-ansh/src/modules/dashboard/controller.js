import { prisma } from '../../lib/prisma.js';
import { getPagination } from '../../utils/pagination.js';

export async function getKpis(req, res, next) {
  try {
    const [
      totalProductsInStock,
      productCount,
      lowStockCount,
      pendingReceipts,
      pendingDeliveries,
      scheduledTransfers,
    ] = await Promise.all([
      prisma.stockLevel.aggregate({ _sum: { quantity: true } }),
      prisma.product.count(),
      getLowStockCount(),
      prisma.receipt.count({ where: { status: { notIn: ['done', 'canceled'] } } }),
      prisma.deliveryOrder.count({ where: { status: { notIn: ['done', 'canceled'] } } }),
      prisma.internalTransfer.count({
        where: { status: { notIn: ['done', 'canceled'] }, scheduledAt: { not: null } },
      }),
    ]);

    const totalStock = totalProductsInStock._sum.quantity ?? 0;

    res.json({
      totalProductsInStock: totalStock,
      totalProductTypes: productCount,
      lowStockOutOfStockItems: lowStockCount,
      pendingReceipts,
      pendingDeliveries,
      internalTransfersScheduled: scheduledTransfers,
    });
  } catch (err) {
    next(err);
  }
}

async function getLowStockCount() {
  const products = await prisma.product.findMany({
    include: {
      stockLevels: true,
      reorderRule: true,
    },
  });
  let count = 0;
  for (const p of products) {
    const hasZero = p.stockLevels.some((s) => s.quantity <= 0);
    const belowReorder =
      p.reorderRule &&
      p.stockLevels.some((s) => s.warehouseId === (p.reorderRule?.warehouseId ?? null) && s.quantity <= p.reorderRule.reorderPoint);
    const anyBelowReorder =
      p.reorderRule &&
      p.stockLevels.some((s) => s.quantity <= p.reorderRule.reorderPoint);
    if (hasZero || anyBelowReorder) count++;
  }
  return count;
}

export async function getOperations(req, res, next) {
  try {
    const { documentType, status, warehouseId, categoryId } = req.query;
    const { skip, take, page, limit } = getPagination(req.query);

    const result = [];
    const statusFilter = status ? { status } : { status: { notIn: ['canceled'] } };
    const warehouseFilter = warehouseId ? { warehouseId } : {};

    if (!documentType || documentType === 'receipts') {
      const where = { ...statusFilter, ...warehouseFilter };
      const items = await prisma.receipt.findMany({
        where,
        skip: documentType ? 0 : skip,
        take: documentType ? take : Math.ceil(take / 4),
        orderBy: { createdAt: 'desc' },
        include: { warehouse: { select: { id: true, name: true } } },
      });
      items.forEach((r) =>
        result.push({
          id: r.id,
          number: r.number,
          documentType: 'receipt',
          status: r.status,
          warehouse: r.warehouse,
          warehouseId: r.warehouseId,
          createdAt: r.createdAt,
          validatedAt: r.validatedAt,
        })
      );
    }

    if (!documentType || documentType === 'deliveries') {
      const where = { ...statusFilter, ...warehouseFilter };
      const items = await prisma.deliveryOrder.findMany({
        where,
        skip: documentType ? 0 : skip,
        take: documentType ? take : Math.ceil(take / 4),
        orderBy: { createdAt: 'desc' },
        include: { warehouse: { select: { id: true, name: true } } },
      });
      items.forEach((d) =>
        result.push({
          id: d.id,
          number: d.number,
          documentType: 'delivery',
          status: d.status,
          warehouse: d.warehouse,
          warehouseId: d.warehouseId,
          createdAt: d.createdAt,
          validatedAt: d.validatedAt,
        })
      );
    }

    if (!documentType || documentType === 'internal' || documentType === 'transfers') {
      const where = { ...statusFilter };
      if (warehouseId) {
        where.OR = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }];
      }
      const items = await prisma.internalTransfer.findMany({
        where,
        skip: documentType ? 0 : skip,
        take: documentType ? take : Math.ceil(take / 4),
        orderBy: { createdAt: 'desc' },
        include: {
          fromWarehouse: { select: { id: true, name: true } },
          toWarehouse: { select: { id: true, name: true } },
        },
      });
      items.forEach((t) =>
        result.push({
          id: t.id,
          number: t.number,
          documentType: 'transfer',
          status: t.status,
          warehouse: null,
          warehouseId: null,
          fromWarehouse: t.fromWarehouse,
          toWarehouse: t.toWarehouse,
          scheduledAt: t.scheduledAt,
          createdAt: t.createdAt,
          validatedAt: t.validatedAt,
        })
      );
    }

    if (!documentType || documentType === 'adjustments') {
      const where = { ...statusFilter, ...warehouseFilter };
      const items = await prisma.stockAdjustment.findMany({
        where,
        skip: documentType ? 0 : skip,
        take: documentType ? take : Math.ceil(take / 4),
        orderBy: { createdAt: 'desc' },
        include: { warehouse: { select: { id: true, name: true } } },
      });
      items.forEach((a) =>
        result.push({
          id: a.id,
          number: a.number,
          documentType: 'adjustment',
          status: a.status,
          warehouse: a.warehouse,
          warehouseId: a.warehouseId,
          createdAt: a.createdAt,
          validatedAt: a.validatedAt,
        })
      );
    }

    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const paginated = result.slice(skip, skip + take);
    res.json({ items: paginated, total: result.length, page: parseInt(page, 10), limit: take });
  } catch (err) {
    next(err);
  }
}

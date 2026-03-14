import { prisma } from '../../lib/prisma.js';
import { getNextNumber } from '../../utils/docNumber.js';
import { getPagination } from '../../utils/pagination.js';

export async function list(req, res, next) {
  try {
    const { status, fromWarehouseId, toWarehouseId } = req.query;
    const { skip, take, page, limit } = getPagination(req.query);
    const where = {};
    if (status) where.status = status;
    if (fromWarehouseId) where.fromWarehouseId = fromWarehouseId;
    if (toWarehouseId) where.toWarehouseId = toWarehouseId;

    const [items, total] = await Promise.all([
      prisma.internalTransfer.findMany({
        where,
        skip,
        take,
        include: {
          fromWarehouse: { select: { id: true, name: true, code: true } },
          toWarehouse: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, email: true, name: true } },
          lines: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.internalTransfer.count({ where }),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const transfer = await prisma.internalTransfer.findUnique({
      where: { id: req.params.id },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        createdBy: { select: { id: true, email: true, name: true } },
        lines: { include: { product: true } },
      },
    });
    if (!transfer) return res.status(404).json({ success: false, error: 'Transfer not found' });
    res.json(transfer);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { fromWarehouseId, toWarehouseId, scheduledAt, notes, lines } = req.body;
    if (fromWarehouseId === toWarehouseId) {
      return res.status(400).json({ success: false, error: 'Source and destination warehouse must be different' });
    }
    const number = await getNextNumber('transfer');
    const transfer = await prisma.internalTransfer.create({
      data: {
        number,
        fromWarehouseId,
        toWarehouseId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes: notes || null,
        status: 'draft',
        createdById: req.user?.id,
        lines: lines?.length
          ? { create: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) }
          : undefined,
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        lines: { include: { product: true } },
      },
    });
    res.status(201).json(transfer);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const transfer = await prisma.internalTransfer.findUnique({ where: { id: req.params.id } });
    if (!transfer) return res.status(404).json({ success: false, error: 'Transfer not found' });
    if (transfer.status === 'done' || transfer.status === 'canceled') {
      return res.status(400).json({ success: false, error: 'Cannot edit validated or canceled transfer' });
    }

    const { fromWarehouseId, toWarehouseId, scheduledAt, notes, status, lines } = req.body;
    if (fromWarehouseId === toWarehouseId && fromWarehouseId) {
      return res.status(400).json({ success: false, error: 'Source and destination must be different' });
    }
    const data = {
      ...(fromWarehouseId && { fromWarehouseId }),
      ...(toWarehouseId && { toWarehouseId }),
      ...(notes !== undefined && { notes }),
      ...(status && { status }),
      ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
    };
    if (lines && Array.isArray(lines)) {
      await prisma.transferLine.deleteMany({ where: { transferId: req.params.id } });
      if (lines.length) {
        await prisma.transferLine.createMany({
          data: lines.map((l) => ({
            transferId: req.params.id,
            productId: l.productId,
            quantity: l.quantity,
          })),
        });
      }
    }
    const updated = await prisma.internalTransfer.update({
      where: { id: req.params.id },
      data,
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        lines: { include: { product: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function validateTransfer(req, res, next) {
  try {
    const transfer = await prisma.internalTransfer.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!transfer) return res.status(404).json({ success: false, error: 'Transfer not found' });
    if (transfer.status === 'done') return res.status(400).json({ success: false, error: 'Already validated' });
    if (transfer.status === 'canceled') return res.status(400).json({ success: false, error: 'Transfer is canceled' });
    if (!transfer.lines?.length) return res.status(400).json({ success: false, error: 'Add at least one line' });

    for (const line of transfer.lines) {
      const level = await prisma.stockLevel.findUnique({
        where: {
          productId_warehouseId: { productId: line.productId, warehouseId: transfer.fromWarehouseId },
        },
      });
      const qty = level?.quantity ?? 0;
      if (qty < line.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock in source warehouse for product ${line.productId}: have ${qty}, need ${line.quantity}`,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        await tx.stockLevel.update({
          where: {
            productId_warehouseId: { productId: line.productId, warehouseId: transfer.fromWarehouseId },
          },
          data: { quantity: { decrement: line.quantity } },
        });
        await tx.stockMove.create({
          data: {
            productId: line.productId,
            warehouseId: transfer.fromWarehouseId,
            quantity: -line.quantity,
            referenceType: 'transfer_out',
            referenceId: transfer.id,
          },
        });
        await tx.stockLevel.upsert({
          where: {
            productId_warehouseId: { productId: line.productId, warehouseId: transfer.toWarehouseId },
          },
          create: { productId: line.productId, warehouseId: transfer.toWarehouseId, quantity: line.quantity },
          update: { quantity: { increment: line.quantity } },
        });
        await tx.stockMove.create({
          data: {
            productId: line.productId,
            warehouseId: transfer.toWarehouseId,
            quantity: line.quantity,
            referenceType: 'transfer_in',
            referenceId: transfer.id,
          },
        });
      }
      await tx.internalTransfer.update({
        where: { id: transfer.id },
        data: { status: 'done', validatedAt: new Date() },
      });
    });

    const updated = await prisma.internalTransfer.findUnique({
      where: { id: req.params.id },
      include: { fromWarehouse: true, toWarehouse: true, lines: { include: { product: true } } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function cancel(req, res, next) {
  try {
    const transfer = await prisma.internalTransfer.findUnique({ where: { id: req.params.id } });
    if (!transfer) return res.status(404).json({ success: false, error: 'Transfer not found' });
    if (transfer.status === 'done') return res.status(400).json({ success: false, error: 'Cannot cancel validated transfer' });
    await prisma.internalTransfer.update({
      where: { id: req.params.id },
      data: { status: 'canceled' },
    });
    res.json({ status: 'canceled' });
  } catch (err) {
    next(err);
  }
}

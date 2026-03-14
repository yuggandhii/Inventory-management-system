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
      prisma.receipt.findMany({
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
      prisma.receipt.count({ where }),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      include: {
        warehouse: true,
        createdBy: { select: { id: true, email: true, name: true } },
        lines: { include: { product: true } },
      },
    });
    if (!receipt) return res.status(404).json({ success: false, error: 'Receipt not found' });
    res.json(receipt);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { warehouseId, supplierRef, notes, lines } = req.body;
    const number = await getNextNumber('receipt');
    const receipt = await prisma.receipt.create({
      data: {
        number,
        warehouseId,
        supplierRef: supplierRef || null,
        notes: notes || null,
        status: 'draft',
        createdById: req.user?.id,
        lines: lines?.length
          ? {
              create: lines.map((l) => ({
                productId: l.productId,
                quantity: l.quantity,
                unitPrice: l.unitPrice ?? null,
              })),
            }
          : undefined,
      },
      include: {
        warehouse: true,
        lines: { include: { product: true } },
      },
    });
    res.status(201).json(receipt);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const receipt = await prisma.receipt.findUnique({ where: { id: req.params.id } });
    if (!receipt) return res.status(404).json({ success: false, error: 'Receipt not found' });
    if (receipt.status === 'done' || receipt.status === 'canceled') {
      return res.status(400).json({ success: false, error: 'Cannot edit validated or canceled receipt' });
    }

    const { warehouseId, supplierRef, notes, status, lines } = req.body;
    const data = {
      ...(warehouseId && { warehouseId }),
      ...(supplierRef !== undefined && { supplierRef }),
      ...(notes !== undefined && { notes }),
      ...(status && { status }),
    };
    if (lines && Array.isArray(lines)) {
      await prisma.receiptLine.deleteMany({ where: { receiptId: req.params.id } });
      if (lines.length) {
        await prisma.receiptLine.createMany({
          data: lines.map((l) => ({
            receiptId: req.params.id,
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice ?? null,
          })),
        });
      }
    }
    const updated = await prisma.receipt.update({
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

export async function validateReceipt(req, res, next) {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!receipt) return res.status(404).json({ success: false, error: 'Receipt not found' });
    if (receipt.status === 'done') return res.status(400).json({ success: false, error: 'Receipt already validated' });
    if (receipt.status === 'canceled') return res.status(400).json({ success: false, error: 'Receipt is canceled' });
    if (!receipt.lines?.length) return res.status(400).json({ success: false, error: 'Add at least one line' });

    await prisma.$transaction(async (tx) => {
      for (const line of receipt.lines) {
        await tx.stockLevel.upsert({
          where: {
            productId_warehouseId: { productId: line.productId, warehouseId: receipt.warehouseId },
          },
          create: { productId: line.productId, warehouseId: receipt.warehouseId, quantity: line.quantity },
          update: { quantity: { increment: line.quantity } },
        });
        await tx.stockMove.create({
          data: {
            productId: line.productId,
            warehouseId: receipt.warehouseId,
            quantity: line.quantity,
            referenceType: 'receipt',
            referenceId: receipt.id,
          },
        });
      }
      await tx.receipt.update({
        where: { id: receipt.id },
        data: { status: 'done', validatedAt: new Date() },
      });
    });

    const updated = await prisma.receipt.findUnique({
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
    const receipt = await prisma.receipt.findUnique({ where: { id: req.params.id } });
    if (!receipt) return res.status(404).json({ success: false, error: 'Receipt not found' });
    if (receipt.status === 'done') return res.status(400).json({ success: false, error: 'Cannot cancel validated receipt' });
    await prisma.receipt.update({
      where: { id: req.params.id },
      data: { status: 'canceled' },
    });
    res.json({ status: 'canceled' });
  } catch (err) {
    next(err);
  }
}

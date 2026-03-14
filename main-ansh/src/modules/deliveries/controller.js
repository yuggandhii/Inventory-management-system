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
      prisma.deliveryOrder.findMany({
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
      prisma.deliveryOrder.count({ where }),
    ]);
    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.id },
      include: {
        warehouse: true,
        createdBy: { select: { id: true, email: true, name: true } },
        lines: { include: { product: true } },
      },
    });
    if (!delivery) return res.status(404).json({ success: false, error: 'Delivery order not found' });
    res.json(delivery);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { warehouseId, customerRef, notes, lines } = req.body;
    const number = await getNextNumber('delivery');
    const delivery = await prisma.deliveryOrder.create({
      data: {
        number,
        warehouseId,
        customerRef: customerRef || null,
        notes: notes || null,
        status: 'draft',
        createdById: req.user?.id,
        lines: lines?.length
          ? { create: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) }
          : undefined,
      },
      include: {
        warehouse: true,
        lines: { include: { product: true } },
      },
    });
    res.status(201).json(delivery);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const delivery = await prisma.deliveryOrder.findUnique({ where: { id: req.params.id } });
    if (!delivery) return res.status(404).json({ success: false, error: 'Delivery order not found' });
    if (delivery.status === 'done' || delivery.status === 'canceled') {
      return res.status(400).json({ success: false, error: 'Cannot edit validated or canceled delivery' });
    }

    const { warehouseId, customerRef, notes, status, lines } = req.body;
    const data = {
      ...(warehouseId && { warehouseId }),
      ...(customerRef !== undefined && { customerRef }),
      ...(notes !== undefined && { notes }),
      ...(status && { status }),
    };
    if (lines && Array.isArray(lines)) {
      await prisma.deliveryLine.deleteMany({ where: { deliveryOrderId: req.params.id } });
      if (lines.length) {
        await prisma.deliveryLine.createMany({
          data: lines.map((l) => ({
            deliveryOrderId: req.params.id,
            productId: l.productId,
            quantity: l.quantity,
          })),
        });
      }
    }
    const updated = await prisma.deliveryOrder.update({
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

export async function validateDelivery(req, res, next) {
  try {
    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!delivery) return res.status(404).json({ success: false, error: 'Delivery order not found' });
    if (delivery.status === 'done') return res.status(400).json({ success: false, error: 'Already validated' });
    if (delivery.status === 'canceled') return res.status(400).json({ success: false, error: 'Delivery is canceled' });
    if (!delivery.lines?.length) return res.status(400).json({ success: false, error: 'Add at least one line' });

    // Check stock availability
    for (const line of delivery.lines) {
      const level = await prisma.stockLevel.findUnique({
        where: {
          productId_warehouseId: { productId: line.productId, warehouseId: delivery.warehouseId },
        },
      });
      const qty = level?.quantity ?? 0;
      if (qty < line.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for product ${line.productId}: have ${qty}, need ${line.quantity}`,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const line of delivery.lines) {
        await tx.stockLevel.update({
          where: {
            productId_warehouseId: { productId: line.productId, warehouseId: delivery.warehouseId },
          },
          data: { quantity: { decrement: line.quantity } },
        });
        await tx.stockMove.create({
          data: {
            productId: line.productId,
            warehouseId: delivery.warehouseId,
            quantity: -line.quantity,
            referenceType: 'delivery',
            referenceId: delivery.id,
          },
        });
      }
      await tx.deliveryOrder.update({
        where: { id: delivery.id },
        data: { status: 'done', validatedAt: new Date() },
      });
    });

    const updated = await prisma.deliveryOrder.findUnique({
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
    const delivery = await prisma.deliveryOrder.findUnique({ where: { id: req.params.id } });
    if (!delivery) return res.status(404).json({ success: false, error: 'Delivery order not found' });
    if (delivery.status === 'done') return res.status(400).json({ success: false, error: 'Cannot cancel validated delivery' });
    await prisma.deliveryOrder.update({
      where: { id: req.params.id },
      data: { status: 'canceled' },
    });
    res.json({ status: 'canceled' });
  } catch (err) {
    next(err);
  }
}

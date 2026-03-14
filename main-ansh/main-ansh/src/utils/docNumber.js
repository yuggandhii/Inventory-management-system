import { prisma } from '../lib/prisma.js';

const PREFIXES = {
  receipt: 'RCP',
  delivery: 'DO',
  transfer: 'TRF',
  adjustment: 'ADJ',
};

export async function getNextNumber(type) {
  const prefix = PREFIXES[type] || 'DOC';
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;

  const tables = {
    receipt: prisma.receipt,
    delivery: prisma.deliveryOrder,
    transfer: prisma.internalTransfer,
    adjustment: prisma.stockAdjustment,
  };
  const model = tables[type];
  if (!model) return `${prefix}-${year}-0001`;

  const last = await model.findFirst({
    where: { number: { startsWith: `${prefix}-${year}-` } },
    orderBy: { number: 'desc' },
  });

  let next = 1;
  if (last) {
    const parts = last.number.split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
}

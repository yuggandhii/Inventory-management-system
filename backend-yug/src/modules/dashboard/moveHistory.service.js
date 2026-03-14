const db = require('../../db');

const list = async ({ search, from_date, to_date, page = 1, limit = 20 }) => {
  const q = db('stock_moves')
    .select(
      'stock_moves.id', 'stock_moves.reference', 'stock_moves.move_type',
      'stock_moves.status', 'stock_moves.contact_name', 'stock_moves.validated_at',
      'stock_moves.scheduled_date',
      'fl.name as from_location', 'tl.name as to_location',
      'products.name as product_name', 'products.sku',
      'move_lines.qty_done', 'move_lines.qty_demand',
    )
    .join('locations as fl', 'stock_moves.from_location_id', 'fl.id')
    .join('locations as tl', 'stock_moves.to_location_id',   'tl.id')
    .join('move_lines', 'move_lines.move_id', 'stock_moves.id')
    .join('products',   'move_lines.product_id', 'products.id')
    .whereIn('stock_moves.status', ['done', 'cancelled'])
    .orderBy('stock_moves.validated_at', 'desc');

  if (search)    q.where((w) => w.whereILike('stock_moves.reference', `%${search}%`).orWhereILike('stock_moves.contact_name', `%${search}%`));
  if (from_date) q.where('stock_moves.validated_at', '>=', from_date);
  if (to_date)   q.where('stock_moves.validated_at', '<=', to_date);

  const [{ count }] = await db('stock_moves')
    .countDistinct('stock_moves.id as count')
    .join('move_lines', 'move_lines.move_id', 'stock_moves.id')
    .whereIn('stock_moves.status', ['done', 'cancelled'])
    .modify((q) => {
      if (search) q.where((w) => w.whereILike('stock_moves.reference', `%${search}%`).orWhereILike('stock_moves.contact_name', `%${search}%`));
    });

  const offset = (Number(page) - 1) * Number(limit);
  const data = await q.limit(Number(limit)).offset(offset);
  return { data, total: Number(count), page: Number(page), limit: Number(limit) };
};

module.exports = { list };

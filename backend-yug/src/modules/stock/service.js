const db = require('../../db');

const list = async ({ search, location_id }) => {
  const q = db('stock_quant')
    .select(
      'products.id as product_id',
      'products.name',
      'products.sku',
      'products.unit_of_measure',
      'products.cost_per_unit',
      'locations.name as location_name',
      'stock_quant.qty_on_hand',
      'stock_quant.location_id',
    )
    .join('products',  'stock_quant.product_id',  'products.id')
    .join('locations', 'stock_quant.location_id', 'locations.id')
    .where('products.is_active', true)
    .orderBy('products.name');

  if (search)      q.where((w) => w.whereILike('products.name', `%${search}%`).orWhereILike('products.sku', `%${search}%`));
  if (location_id) q.where('stock_quant.location_id', location_id);

  const rows = await q;

  const pendingDeliveries = await db('move_lines')
    .select('move_lines.product_id', db.raw('SUM(move_lines.qty_demand) as reserved'))
    .join('stock_moves', 'move_lines.move_id', 'stock_moves.id')
    .whereIn('stock_moves.status', ['draft', 'waiting', 'ready'])
    .where('stock_moves.move_type', 'delivery')
    .groupBy('move_lines.product_id');

  const reservedMap = {};
  for (const row of pendingDeliveries) {
    reservedMap[row.product_id] = Number(row.reserved);
  }

  return rows.map((r) => ({
    ...r,
    qty_on_hand:   Number(r.qty_on_hand),
    free_to_use:   Math.max(0, Number(r.qty_on_hand) - (reservedMap[r.product_id] || 0)),
    qty_reserved:  reservedMap[r.product_id] || 0,
  }));
};

module.exports = { list };

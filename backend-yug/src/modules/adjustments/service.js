const db = require('../../db');

const list = async ({ product_id, location_id, page = 1, limit = 20 }) => {
  const q = db('adjustments')
    .select('adjustments.*', 'products.name as product_name', 'products.sku', 'locations.name as location_name')
    .join('products',  'adjustments.product_id',  'products.id')
    .join('locations', 'adjustments.location_id', 'locations.id')
    .orderBy('adjustments.created_at', 'desc');

  if (product_id)  q.where('adjustments.product_id',  product_id);
  if (location_id) q.where('adjustments.location_id', location_id);

  const [{ count }] = await db('adjustments').count('* as count')
    .modify((q) => {
      if (product_id)  q.where('product_id',  product_id);
      if (location_id) q.where('location_id', location_id);
    });

  const offset = (Number(page) - 1) * Number(limit);
  const data = await q.limit(Number(limit)).offset(offset);
  return { data, total: Number(count), page: Number(page), limit: Number(limit) };
};

const create = async ({ product_id, location_id, qty_counted, reason }, userId) => {
  const quant = await db('stock_quant').where({ product_id, location_id }).first();
  const qty_system = quant ? Number(quant.qty_on_hand) : 0;
  const delta = Number(qty_counted) - qty_system;

  return db.transaction(async (trx) => {
    if (quant) {
      await trx('stock_quant').where({ product_id, location_id }).update({ qty_on_hand: qty_counted });
    } else {
      await trx('stock_quant').insert({ product_id, location_id, qty_on_hand: qty_counted });
    }

    const [adjustment] = await trx('adjustments').insert({
      product_id, location_id, qty_counted, qty_system, delta,
      reason,
      created_by: userId,
      applied_at: new Date(),
    }).returning('*');

    return adjustment;
  });
};

module.exports = { list, create };

const db = require('../../db');
const { generateRef } = require('../../utils/refGenerator');

const list = async ({ status, search, from_date, to_date, page = 1, limit = 20 }) => {
  const buildBase = () => {
    const q = db('stock_moves')
      .select('stock_moves.*',
        'fl.name as from_location_name',
        'tl.name as to_location_name')
      .join('locations as fl', 'stock_moves.from_location_id', 'fl.id')
      .join('locations as tl', 'stock_moves.to_location_id',   'tl.id')
      .where('stock_moves.move_type', 'receipt')
      .orderBy('stock_moves.created_at', 'desc');
    if (status)    q.where('stock_moves.status', status);
    if (search)    q.where((w) => w.whereILike('stock_moves.reference', `%${search}%`).orWhereILike('stock_moves.contact_name', `%${search}%`));
    if (from_date) q.where('stock_moves.scheduled_date', '>=', from_date);
    if (to_date)   q.where('stock_moves.scheduled_date', '<=', to_date);
    return q;
  };

  const [{ count }] = await db('stock_moves').count('* as count').where('move_type', 'receipt')
    .modify((q) => {
      if (status)    q.where('status', status);
      if (search)    q.where((w) => w.whereILike('reference', `%${search}%`).orWhereILike('contact_name', `%${search}%`));
      if (from_date) q.where('scheduled_date', '>=', from_date);
      if (to_date)   q.where('scheduled_date', '<=', to_date);
    });

  const offset = (Number(page) - 1) * Number(limit);
  const data = await buildBase().limit(Number(limit)).offset(offset);
  return { data, total: Number(count), page: Number(page), limit: Number(limit) };
};

const getById = async (id) => {
  const move = await db('stock_moves')
    .select('stock_moves.*', 'fl.name as from_location_name', 'tl.name as to_location_name')
    .join('locations as fl', 'stock_moves.from_location_id', 'fl.id')
    .join('locations as tl', 'stock_moves.to_location_id',   'tl.id')
    .where('stock_moves.id', id).where('stock_moves.move_type', 'receipt').first();
  if (!move) { const err = new Error('Receipt not found'); err.statusCode = 404; throw err; }

  const lines = await db('move_lines')
    .select('move_lines.*', 'products.name as product_name', 'products.sku')
    .join('products', 'move_lines.product_id', 'products.id')
    .where('move_lines.move_id', id);

  return { ...move, lines };
};

const create = async (data, userId) => {
  const { lines, ...moveData } = data;
  const reference = await generateRef('WH', 'IN');

  return db.transaction(async (trx) => {
    const [move] = await trx('stock_moves').insert({
      ...moveData,
      reference,
      move_type:  'receipt',
      status:     'draft',
      created_by: userId,
    }).returning('*');

    await trx('move_lines').insert(lines.map((l) => ({
      move_id:    move.id,
      product_id: l.product_id,
      qty_demand: l.qty_demand,
      qty_done:   0,
    })));

    return move;
  });
};

const todo = async (id, userId) => {
  const move = await db('stock_moves').where({ id, move_type: 'receipt' }).first();
  if (!move) { const err = new Error('Receipt not found'); err.statusCode = 404; throw err; }
  if (move.status !== 'draft') { const err = new Error(`Cannot move to ready from ${move.status}`); err.statusCode = 400; throw err; }
  const [updated] = await db('stock_moves').where({ id }).update({ status: 'ready' }).returning('*');
  return updated;
};

const validate = async (id, userId) => {
  const move = await db('stock_moves').where({ id, move_type: 'receipt' }).first();
  if (!move) { const err = new Error('Receipt not found'); err.statusCode = 404; throw err; }
  if (move.status !== 'ready') { const err = new Error(`Cannot validate from ${move.status}`); err.statusCode = 400; throw err; }

  const lines = await db('move_lines').where({ move_id: id });

  return db.transaction(async (trx) => {
    for (const line of lines) {
      const qty = Number(line.qty_demand);
      const existing = await trx('stock_quant')
        .where({ product_id: line.product_id, location_id: move.to_location_id }).first();

      if (existing) {
        await trx('stock_quant')
          .where({ product_id: line.product_id, location_id: move.to_location_id })
          .update({ qty_on_hand: Number(existing.qty_on_hand) + qty });
      } else {
        await trx('stock_quant').insert({
          product_id:  line.product_id,
          location_id: move.to_location_id,
          qty_on_hand: qty,
        });
      }

      await trx('move_lines').where({ id: line.id }).update({ qty_done: qty });
    }

    const [updated] = await trx('stock_moves').where({ id }).update({
      status:       'done',
      validated_at: new Date(),
      validated_by: userId,
    }).returning('*');

    return updated;
  });
};

const cancel = async (id) => {
  const move = await db('stock_moves').where({ id, move_type: 'receipt' }).first();
  if (!move) { const err = new Error('Receipt not found'); err.statusCode = 404; throw err; }
  if (move.status === 'done') { const err = new Error('Cannot cancel a completed receipt'); err.statusCode = 400; throw err; }
  const [updated] = await db('stock_moves').where({ id }).update({ status: 'cancelled' }).returning('*');
  return updated;
};

module.exports = { list, getById, create, todo, validate, cancel };

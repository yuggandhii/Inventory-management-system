const db = require('../../db');

const list = async ({ search, category_id, is_active, page = 1, limit = 20 }) => {
  const buildQuery = () => {
    const q = db('products')
      .select('products.*', 'product_categories.name as category_name')
      .leftJoin('product_categories', 'products.category_id', 'product_categories.id')
      .orderBy('products.created_at', 'desc');
    if (search) q.where((w) => w.whereILike('products.name', `%${search}%`).orWhereILike('products.sku', `%${search}%`));
    if (category_id) q.where('products.category_id', category_id);
    if (is_active !== undefined) q.where('products.is_active', is_active === 'true');
    return q;
  };

  const [{ count }] = await db('products').count('* as count')
    .modify((q) => {
      if (search) q.where((w) => w.whereILike('name', `%${search}%`).orWhereILike('sku', `%${search}%`));
      if (category_id) q.where('category_id', category_id);
      if (is_active !== undefined) q.where('is_active', is_active === 'true');
    });

  const offset = (Number(page) - 1) * Number(limit);
  const data = await buildQuery().limit(Number(limit)).offset(offset);

  return { data, total: Number(count), page: Number(page), limit: Number(limit) };
};

const getById = async (id) => {
  const product = await db('products')
    .select('products.*', 'product_categories.name as category_name')
    .leftJoin('product_categories', 'products.category_id', 'product_categories.id')
    .where('products.id', id).first();
  if (!product) { const err = new Error('Product not found'); err.statusCode = 404; throw err; }
  return product;
};

const create = async (data) => {
  const existing = await db('products').where({ sku: data.sku }).first();
  if (existing) { const err = new Error('A product with this SKU already exists'); err.statusCode = 409; throw err; }
  const [product] = await db('products').insert(data).returning('*');
  return product;
};

const update = async (id, data) => {
  if (data.sku) {
    const existing = await db('products').where({ sku: data.sku }).whereNot({ id }).first();
    if (existing) { const err = new Error('A product with this SKU already exists'); err.statusCode = 409; throw err; }
  }
  const [product] = await db('products').where({ id }).update(data).returning('*');
  if (!product) { const err = new Error('Product not found'); err.statusCode = 404; throw err; }
  return product;
};

const toggleActive = async (id) => {
  const product = await db('products').where({ id }).first();
  if (!product) { const err = new Error('Product not found'); err.statusCode = 404; throw err; }
  const [updated] = await db('products').where({ id }).update({ is_active: !product.is_active }).returning('*');
  return updated;
};

const getStock = async (id) => {
  await getById(id);
  return db('stock_quant')
    .select('stock_quant.*', 'locations.name as location_name', 'locations.short_code')
    .join('locations', 'stock_quant.location_id', 'locations.id')
    .where('stock_quant.product_id', id);
};

const listCategories = async () => db('product_categories').orderBy('name');

const createCategory = async ({ name, description }) => {
  const [cat] = await db('product_categories').insert({ name, description }).returning('*');
  return cat;
};

module.exports = { list, getById, create, update, toggleActive, getStock, listCategories, createCategory };

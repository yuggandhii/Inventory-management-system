const db = require('../../db');

const listWarehouses  = async () => db('warehouses').where({ is_active: true }).orderBy('name');
const getWarehouse    = async (id) => {
  const wh = await db('warehouses').where({ id }).first();
  if (!wh) { const err = new Error('Warehouse not found'); err.statusCode = 404; throw err; }
  return wh;
};
const createWarehouse = async (data) => {
  const [wh] = await db('warehouses').insert(data).returning('*');
  return wh;
};
const updateWarehouse = async (id, data) => {
  const [wh] = await db('warehouses').where({ id }).update(data).returning('*');
  if (!wh) { const err = new Error('Warehouse not found'); err.statusCode = 404; throw err; }
  return wh;
};

const listLocations   = async (warehouse_id) => {
  const query = db('locations').orderBy('name');
  if (warehouse_id) query.where({ warehouse_id });
  return query;
};
const createLocation  = async (data) => {
  const [loc] = await db('locations').insert(data).returning('*');
  return loc;
};
const updateLocation  = async (id, data) => {
  const [loc] = await db('locations').where({ id }).update(data).returning('*');
  if (!loc) { const err = new Error('Location not found'); err.statusCode = 404; throw err; }
  return loc;
};

module.exports = { listWarehouses, getWarehouse, createWarehouse, updateWarehouse, listLocations, createLocation, updateLocation };

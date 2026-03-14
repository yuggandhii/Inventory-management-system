const bcrypt = require('bcryptjs');

exports.seed = async (knex) => {
  await knex('adjustments').del();
  await knex('stock_quant').del();
  await knex('move_lines').del();
  await knex('stock_moves').del();
  await knex('products').del();
  await knex('product_categories').del();
  await knex('locations').del();
  await knex('warehouses').del();
  await knex('users').del();

  await knex('users').insert([
    { login_id: 'admin1', email: 'admin@coreinventory.local', password_hash: bcrypt.hashSync('Admin@1234', 12), role: 'manager' },
    { login_id: 'staff1', email: 'staff1@coreinventory.local', password_hash: bcrypt.hashSync('Staff@1234', 12), role: 'staff' },
  ]);

  const [wh] = await knex('warehouses').insert([
    { name: 'Main Warehouse', short_code: 'WH', address: '123 Industrial Area' },
  ]).returning('*');

  const [vendor, customer, stock1, stock2] = await knex('locations').insert([
    { warehouse_id: null,   name: 'Vendors',   short_code: 'VENDORS',   type: 'vendor'   },
    { warehouse_id: null,   name: 'Customers', short_code: 'CUSTOMERS', type: 'customer' },
    { warehouse_id: wh.id,  name: 'WH/Stock1', short_code: 'STOCK1',    type: 'internal' },
    { warehouse_id: wh.id,  name: 'WH/Stock2', short_code: 'STOCK2',    type: 'internal' },
  ]).returning('*');

  const [furniture] = await knex('product_categories').insert([
    { name: 'Furniture',    description: 'Desks, chairs, tables' },
    { name: 'Electronics',  description: 'Computers, accessories' },
    { name: 'Raw Material', description: 'Steel, wood, plastics' },
  ]).returning('*');

  const [desk, table] = await knex('products').insert([
    { name: 'Desk',         sku: 'DESK001', category_id: furniture.id, unit_of_measure: 'pcs', cost_per_unit: 3000 },
    { name: 'Table',        sku: 'TABL001', category_id: furniture.id, unit_of_measure: 'pcs', cost_per_unit: 3000 },
    { name: 'Office Chair', sku: 'CHAR001', category_id: furniture.id, unit_of_measure: 'pcs', cost_per_unit: 1500 },
    { name: 'Steel Rod',    sku: 'STLR001', category_id: null,         unit_of_measure: 'kg',  cost_per_unit: 80   },
  ]).returning('*');

  await knex('stock_quant').insert([
    { product_id: desk.id,  location_id: stock1.id, qty_on_hand: 45 },
    { product_id: table.id, location_id: stock1.id, qty_on_hand: 50 },
  ]);

  console.log('Seed complete. Login: admin1 / Admin@1234');
};

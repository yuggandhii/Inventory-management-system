exports.up = async (knex) => {
  await knex.schema.createTable('stock_moves', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('reference', 30).notNullable().unique();
    t.enu('move_type', ['receipt', 'delivery', 'transfer', 'adjustment']).notNullable();
    t.enu('status', ['draft', 'waiting', 'ready', 'done', 'cancelled']).notNullable().defaultTo('draft');
    t.uuid('from_location_id').notNullable().references('id').inTable('locations');
    t.uuid('to_location_id').notNullable().references('id').inTable('locations');
    t.string('contact_name', 200).nullable();
    t.date('scheduled_date').nullable();
    t.timestamp('validated_at').nullable();
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.uuid('validated_by').nullable().references('id').inTable('users');
    t.text('notes').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('move_lines', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('move_id').notNullable().references('id').inTable('stock_moves').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('products');
    t.decimal('qty_demand', 12, 3).notNullable();
    t.decimal('qty_done', 12, 3).notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('stock_quant', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('product_id').notNullable().references('id').inTable('products');
    t.uuid('location_id').notNullable().references('id').inTable('locations');
    t.decimal('qty_on_hand', 14, 3).notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.unique(['product_id', 'location_id']);
  });

  await knex.schema.createTable('adjustments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('product_id').notNullable().references('id').inTable('products');
    t.uuid('location_id').notNullable().references('id').inTable('locations');
    t.decimal('qty_counted', 14, 3).notNullable();
    t.decimal('qty_system', 14, 3).notNullable();
    t.decimal('delta', 14, 3).notNullable();
    t.string('reason', 255).nullable();
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamp('applied_at').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.table('stock_moves', (t) => {
    t.index(['status', 'move_type']);
    t.index('scheduled_date');
  });

  await knex.schema.table('stock_quant', (t) => {
    t.index('product_id');
    t.index('location_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('adjustments');
  await knex.schema.dropTableIfExists('stock_quant');
  await knex.schema.dropTableIfExists('move_lines');
  await knex.schema.dropTableIfExists('stock_moves');
};

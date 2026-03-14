exports.up = async (knex) => {
  await knex.schema.createTable('warehouses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 100).notNullable();
    t.string('short_code', 10).notNullable().unique();
    t.text('address').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('locations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('warehouse_id').nullable().references('id').inTable('warehouses').onDelete('CASCADE');
    t.string('name', 100).notNullable();
    t.string('short_code', 20).notNullable();
    t.enu('type', ['internal', 'vendor', 'customer']).notNullable().defaultTo('internal');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('locations');
  await knex.schema.dropTableIfExists('warehouses');
};

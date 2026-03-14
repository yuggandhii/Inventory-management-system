exports.up = async (knex) => {
  await knex.schema.createTable('product_categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 100).notNullable().unique();
    t.text('description').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 200).notNullable();
    t.string('sku', 50).notNullable().unique();
    t.uuid('category_id').nullable().references('id').inTable('product_categories').onDelete('SET NULL');
    t.string('unit_of_measure', 20).notNullable().defaultTo('pcs');
    t.integer('cost_per_unit').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.text('notes').nullable();
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('product_categories');
};

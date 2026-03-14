exports.up = async (knex) => {
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('login_id', 12).notNullable().unique();
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.enu('role', ['manager', 'staff']).notNullable().defaultTo('staff');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.string('otp_code', 6).nullable();
    t.timestamp('otp_expires').nullable();
    t.string('refresh_token_hash', 255).nullable();
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('users');
};

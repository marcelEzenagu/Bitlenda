// migrations/20251113_create_user_devices_table.js
exports.up = async function (knex) {
  await knex.schema.createTable('user_devices', (table) => {
    table.bigIncrements('id').primary();
    table.string('device_id', 191).notNullable();
    table
      .string('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.text('public_key').notNullable(); // PEM or base64 public key
    table.boolean('biometrics_enabled').notNullable().defaultTo(true);
    table.dateTime('last_used_at').nullable();
    table.dateTime('created_at').defaultTo(knex.fn.now());
    table.dateTime('updated_at').nullable();
    table.unique(['device_id', 'user_id']);
  });

  await knex.schema.createTable('user_login_history', (table) => {
    table.bigIncrements('id').primary();
    table
      .string('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.enu('login_method', ['PASSWORD', 'BIOMETRICS']).notNullable();
    table.string('device_id').nullable();
    table.string('ip_address').nullable();
    table.string('user_agent').nullable();
    table.boolean('success').defaultTo(true);
    table.dateTime('created_at').defaultTo(knex.fn.now());
  });

  // ensure users has suggested columns
  const hasPin = await knex.schema.hasColumn('users', 'pin_hash');
  if (!hasPin) {
    await knex.schema.alterTable('users', (table) => {
      table.string('pin_hash', 255).nullable();
    });
  }
  const hasBioFlag = await knex.schema.hasColumn('users', 'has_biometrics');
  if (!hasBioFlag) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('has_biometrics').defaultTo(false);
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('user_login_history');
  await knex.schema.dropTableIfExists('user_devices');
  // do not drop user columns to avoid losing production data
};

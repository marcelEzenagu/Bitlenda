/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('users', (table) => {
    table.string('id').primary();
    table.string('first_name');
    table.string('last_name');
    table.string('pin');
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('country').nullable();
    table.string('phone', 20).unique().nullable();
    table.string('bvn', 20).unique().nullable();
    table.string('pin_hash');
    table.integer('token_version').notNullable().defaultTo(1);

    table.boolean('is_biometric_enabled').defaultTo(false);
    table.boolean('is_bvn_verified').defaultTo(false);
    table.dateTime('bvn_verified_at');
    table.boolean('is_email_verified').defaultTo(false);
    table.boolean('is_verified').defaultTo(false);
    table.dateTime('email_verified_at');

    table
      .enum('status', ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'])
      .notNullable()
      .defaultTo('PENDING');
    table.dateTime('last_login');
    table.dateTime('created_at').defaultTo(knex.fn.now());
    table.dateTime('updated_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE users 
    MODIFY COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('users');
};

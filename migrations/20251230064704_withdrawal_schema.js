/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const crypto_withdrawal = await knex.schema.hasTable('crypto_withdrawal');

  if (!crypto_withdrawal) {
    await knex.schema.createTable('crypto_withdrawal', (table) => {
      table.increments('id').primary();
      table
        .string('email')
        .notNullable()
        .references('email')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('client_tx_id').notNullable();
      table.string('tx_id').nullable();
      table.string('address').notNullable();
      table.string('asset').notNullable();
      table.string('network').notNullable();
      table.integer('approved').notNullable().defaultTo(0);
      table.string('approved_by').nullable();
      table.decimal('amount', 14, 2).notNullable();
      table.string('mexc_username').nullable();
      table.string('memo').nullable();
      table.decimal('price', 14, 2).notNullable();
      table
        .enum('status', ['PENDING', 'SUCCESS', 'FAILED'])
        .defaultTo('PENDING');
      table.timestamps(true, true); // created_at, updated_at
    });
  }
  const bank_withdrawal = await knex.schema.hasTable('bank_withdrawal');

  if (!bank_withdrawal) {
    await knex.schema.createTable('bank_withdrawal', (table) => {
      table.increments('id').primary();
      table
        .string('email')
        .notNullable()
        .references('email')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('tx_id').notNullable();
      table.string('reference').notNullable();
      table.string('bank_account_id').notNullable();
      table.string('is_notified').nullable();
      table.decimal('amount', 14, 2).notNullable();
      table.decimal('fee', 14, 2).notNullable();
      table
        .enum('status', ['PENDING', 'SUCCESS', 'FAILED'])
        .defaultTo('PENDING');
      table.timestamps(true, true); // created_at, updated_at
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {};

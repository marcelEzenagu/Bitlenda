/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const bank_accounts = await knex.schema.hasTable('bank_accounts');

  if (!bank_accounts) {
    await knex.schema.createTable('bank_accounts', (table) => {
      table.increments('id').primary();
      table
        .string('email')
        .notNullable()
        .references('email')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('bank_name').notNullable();
      table.string('account_number').notNullable();
      table.string('bank_code').notNullable();
      table.string('account_name').notNullable();
      table.dateTime('deleted_at').nullable();
      table.timestamps(true, true);
    });
  }

  // crypto_deposits
  const crypto_deposits = await knex.schema.hasTable('crypto_deposits');

  console.log('crypto_deposits', crypto_deposits);
  if (!crypto_deposits) {
    await knex.schema.createTable('crypto_deposits', (table) => {
      table.increments('id').primary();
      table
        .string('email')
        .notNullable()
        .references('email')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('tx_id').notNullable();
      table.string('address').notNullable();
      table.string('coin').notNullable();
      table.string('network').notNullable();
      table.decimal('amount', 14, 2).notNullable();
      table.string('source_address').nullable();
      table.decimal('price', 14, 2).notNullable();
      table.timestamps(true, true); // created_at, updated_at
    });
  }

  // bank_deposits
  const bank_deposits = await knex.schema.hasTable('bank_deposits');

  if (!bank_deposits) {
    await knex.schema.createTable('bank_deposits', (table) => {
      table.increments('id').primary();
      table.string('email').notNullable();
      table.string('tx_id').notNullable();
      table.string('reference').notNullable();
      table.string('bank_account_id').notNullable();
      table.string('is_notified').nullable();
      table.decimal('amount', 14, 2).notNullable();
      table.decimal('amount_to_receive', 14, 2).notNullable();
      table.decimal('fee', 14, 2).notNullable();
      table
        .enum('status', ['PENDING', 'SUCCESS', 'FAILED'])
        .defaultTo('PENDING');

      table.timestamps(true, true); // created_at, updated_at
    });
  }

  const fcm_tokens = await knex.schema.hasTable('fcm_tokens');

  if (!fcm_tokens) {
    await knex.schema.createTable('fcm_tokens', (table) => {
      table.increments('id').primary();
      table
        .string('email')
        .notNullable()
        .references('email')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('token').notNullable();
      table.timestamps(true, true); // created_at, updated_at
    });
  }
  const hasTotal = await knex.schema.hasColumn('users', 'total_token_deposit');

  const hasLastDepositedAt = await knex.schema.hasColumn(
    'users',
    'last_token_deposited_at',
  );

  if (!hasTotal || !hasLastDepositedAt) {
    await knex.schema.alterTable('users', (table) => {
      if (!hasTotal) {
        table.decimal('total_token_deposit', 14, 2).notNullable().defaultTo(0);
      }

      if (!hasLastDepositedAt) {
        table.dateTime('last_token_deposited_at').nullable();
      }
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('bank_accounts');
  await knex.schema.dropTableIfExists('crypto_deposits');
  await knex.schema.dropTableIfExists('bank_deposits');
  await knex.schema.dropTableIfExists('fcm_tokens');

  const hasTotal = await knex.schema.hasColumn('users', 'total_token_deposit');

  const hasLastDepositedAt = await knex.schema.hasColumn(
    'users',
    'last_token_deposited_at',
  );

  if (hasTotal || hasLastDepositedAt) {
    await knex.schema.alterTable('users', (table) => {
      if (hasTotal) table.dropColumn('total_token_deposit');
      if (hasLastDepositedAt) table.dropColumn('last_token_deposited_at');
    });
  }
};

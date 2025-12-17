/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // CRYPTO-ASSETS TABLE
  await knex.schema.createTable('assets', (table) => {
    table.increments('id').primary();
    table.string('coin').notNullable();
    table.string('email').notNullable();
    table.decimal('bal', 14, 2).notNullable().defaultTo(0);
    table.decimal('total_deposited', 14, 2).notNullable().defaultTo(0);
    table.decimal('total_sent', 14, 2).notNullable().defaultTo(0);
    table.timestamps(true, true);
  });

  // CRYPTO-ASSETS TABLE
  await knex.schema.createTable('wallets', (table) => {
    table.increments('id').primary();
    table.string('asset_id').notNullable();
    table.string('coin').notNullable();
    table.string('network').notNullable();
    table.string('memo').notNullable();
    table.string('address').notNullable();
    table.string('provider_username').notNullable();
    table.string('email').notNullable();
    table.timestamps(true, true);
  });

  // subAccountsTable TABLE
  await knex.schema.createTable('mexc_sub_accounts', (table) => {
    table.increments('id').primary();
    table.string('sub_account').notNullable();
    table.string('note').notNullable();
    table.string('api_key').notNullable();
    table.string('secret_key').notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.alterTable('users', (table) => {
    table.integer('withdraw_coin').notNullable().defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('assets');
  await knex.schema.dropTableIfExists('wallets');
  await knex.schema.dropTableIfExists('mexc_sub_accounts');

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('withdraw_coin');
  });
};

exports.up = async function (knex) {
  await knex.schema.alterTable('transactions', function (table) {
    table.decimal('amount', 18, 8).notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('cryptos', function (table) {
    table.decimal('price', 18, 8).notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('assets', function (table) {
    table.decimal('bal', 18, 8).notNullable().defaultTo(0).alter();
    table.decimal('total_deposited', 18, 8).notNullable().defaultTo(0).alter();
    table.decimal('total_sent', 18, 8).notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('crypto_deposits', function (table) {
    table.decimal('amount', 18, 8).notNullable().defaultTo(0).alter();
    table.decimal('price', 18, 8).notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('users', function (table) {
    table
      .decimal('total_token_deposit', 18, 8)
      .notNullable()
      .defaultTo(0)
      .alter();
  });

  await knex.schema.alterTable('crypto_withdrawal', function (table) {
    table.decimal('amount', 18, 8).notNullable().defaultTo(0).alter();
    table.decimal('price', 18, 8).notNullable().defaultTo(0).alter();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('transactions', function (table) {
    table.decimal('amount', 14, 2).notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('cryptos', function (table) {
    table.decimal('price', 14, 2).notNullable().defaultTo(0).alter();
    table.decimal('_24hrs', 14, 2).notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('assets', function (table) {
    table.decimal('bal', 14, 2).notNullable().defaultTo(0).alter();
    table.decimal('total_deposited', 14, 2).notNullable().defaultTo(0).alter();
    table.decimal('total_sent', 14, 2).notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('crypto_deposits', function (table) {
    table.decimal('amount', 14, 2).notNullable().defaultTo(0).alter();
    table.decimal('price', 14, 2).notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('users', function (table) {
    table
      .decimal('total_token_deposit', 14, 2)
      .notNullable()
      .defaultTo(0)
      .alter();
  });

  await knex.schema.alterTable('crypto_withdrawal', function (table) {
    table.decimal('amount', 14, 2).notNullable().defaultTo(0).alter();
    table.decimal('price', 14, 2).notNullable().defaultTo(0).alter();
  });
};

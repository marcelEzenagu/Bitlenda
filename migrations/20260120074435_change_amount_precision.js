exports.up = async function (knex) {
  await knex.schema.alterTable('loans', function (table) {
    table
      .decimal('collateral_amount', 14, 8)
      .notNullable()
      .defaultTo(0)
      .alter();
    table.decimal('repayment_amount').notNullable().defaultTo(0).alter();
    table.decimal('rate', 14, 8).notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('transactions', function (table) {
    table.decimal('amount').notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('cryptos', function (table) {
    table.decimal('price').notNullable().defaultTo(0).alter();
    table.decimal('_24hrs').notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('assets', function (table) {
    table.decimal('bal').notNullable().defaultTo(0).alter();
    table.decimal('total_deposited').notNullable().defaultTo(0).alter();
    table.decimal('total_sent').notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('crypto_deposits', function (table) {
    table.decimal('amount').notNullable().defaultTo(0).alter();
    table.decimal('price').notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('users', function (table) {
    table.decimal('total_token_deposit').notNullable().defaultTo(0).alter();
  });

  await knex.schema.alterTable('crypto_withdrawal', function (table) {
    table.decimal('amount').notNullable().defaultTo(0).alter();
    table.decimal('price').notNullable().defaultTo(0).alter();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('loans', function (table) {
    table
      .decimal('collateral_amount', 14, 2)
      .notNullable()
      .defaultTo(0)
      .alter();
    table.decimal('repayment_amount', 14, 2).notNullable().defaultTo(0).alter();
    table.decimal('rate', 14, 2).notNullable().defaultTo(0).alter();
  });

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

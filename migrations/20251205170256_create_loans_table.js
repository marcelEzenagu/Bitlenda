exports.up = async function (knex) {
  // LOANS TABLE
  await knex.schema.createTable('loans', (table) => {
    table.increments('id').primary();
    // table.string('loan_id', 20).unique().notNullable();
    table.string('email', 255).notNullable();

    table.decimal('requested_amount', 14, 2).notNullable().defaultTo(0);
    table.decimal('balance', 14, 2).notNullable().defaultTo(0);
    table.decimal('amount_paid', 14, 2).notNullable().defaultTo(0);

    table.string('collateral_asset').nullable();
    table.decimal('collateral_amount', 14, 2).nullable().defaultTo(0);
    table.decimal('repayment_amount', 14, 2).nullable().defaultTo(0);
    table.decimal('collateral_min_required', 14, 2).nullable().defaultTo(0);
    table.string('deposit_txid', 80).unique().notNullable();

    table.decimal('rate', 5, 2).notNullable().defaultTo(0);

    table
      .enum('status', ['PENDING', 'APPROVED', 'COMPLETED'])
      .defaultTo('PENDING');

    table.string('approved_by').nullable();
    table.timestamp('approved_at').nullable();
    table.timestamps(true, true); // created_at, updated_at
  });

  // LOAN REPAYMENTS TABLE
  await knex.schema.createTable('loan_repayments', (table) => {
    table.increments('id').primary();
    table
      .integer('loan_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('loans')
      .onDelete('CASCADE');

    table.decimal('amount', 14, 2).notNullable().defaultTo(0);
    table.enum('status', ['PENDING', 'SUCCESS', 'FAILED']).defaultTo('PENDING');

    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // TRANSACTIONS TABLE
  await knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();

    table
      .enum('type', [
        'LOAN_DISBURSE',
        'LOAN_REPAY',
        'COIN_DEPOSIT',
        'FIAT_DEPOSIT',
        'COIN_WITHDRAW',
        'FIAT_WITHDRAW',
      ])
      .notNullable();

    table
      .integer('loan_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('loans')
      .onDelete('SET NULL');

    table.integer('user_id').unsigned().notNullable().index();

    table.decimal('amount', 14, 2).notNullable();

    table.enum('status', ['PENDING', 'SUCCESS', 'FAILED']).defaultTo('PENDING');

    table.string('reference', 40).unique().notNullable();
    table.string('description', 40).nullable();
    table.string('to', 255).nullable();
    table.string('asset', 40).nullable();
    table.enum('direction', ['credit', 'debit']).notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // CRYPTOS TABLE
  await knex.schema.createTable('cryptos', (table) => {
    table.increments('id').primary();

    table.string('coin').notNullable();
    table.string('pair').notNullable();
    table.string('name').notNullable();
    table.string('network').notNullable();
    table.decimal('price', 14, 2).notNullable();
    table.decimal('_24hrs', 14, 2).notNullable();
    table.enum('status', ['1', '2', '3']).defaultTo('1');
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('loan_repayments');
  await knex.schema.dropTableIfExists('loans');
  await knex.schema.dropTableIfExists('cryptos');
};

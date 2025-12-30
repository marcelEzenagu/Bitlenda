exports.up = async function (knex) {
  // 1. Ensure loans columns exist
  const hasLoanDepositTxid = await knex.schema.hasColumn(
    'loans',
    'deposit_txid',
  );
  const hasLoanEmail = await knex.schema.hasColumn('loans', 'email');

  if (!hasLoanDepositTxid || !hasLoanEmail) {
    await knex.schema.alterTable('loans', (table) => {
      if (!hasLoanDepositTxid) table.string('deposit_txid', 80).nullable();
      if (!hasLoanEmail) table.string('email', 255).nullable();
    });
  }

  // 2. Ensure transactions.deposit_txid exists
  const hasTxDepositTxid = await knex.schema.hasColumn(
    'transactions',
    'deposit_txid',
  );

  if (!hasTxDepositTxid) {
    await knex.schema.alterTable('transactions', (table) => {
      table.string('deposit_txid', 80).nullable();
    });
  }

  // 3. Backfill ONLY if loan_id exists
  const hasLoanId = await knex.schema.hasColumn('transactions', 'loan_id');

  if (hasLoanId) {
    await knex.raw(`
      UPDATE transactions t
      JOIN loans l ON l.id = t.loan_id
      SET t.deposit_txid = l.deposit_txid
      WHERE t.deposit_txid IS NULL
    `);

    // 4. Drop FK + column AFTER backfill
    await knex.schema.alterTable('transactions', (table) => {
      table.dropForeign(['loan_id']);
    });

    await knex.schema.alterTable('transactions', (table) => {
      table.dropColumn('loan_id');
    });
  }

  // 5. Add unique constraint last
  const [{ count }] = await knex.raw(`
  SELECT COUNT(1) AS count
  FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE()
    AND table_name = 'loans'
    AND index_name = 'loans_deposit_txid_unique'
`);

  if (count === 0) {
    await knex.schema.alterTable('loans', (table) => {
      table.unique(['deposit_txid']);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // ─────────────────────────────────────
  // 1. RESTORE loan_id COLUMN
  // ─────────────────────────────────────
  const hasLoanId = await knex.schema.hasColumn('transactions', 'loan_id');

  if (!hasLoanId) {
    await knex.schema.alterTable('transactions', (table) => {
      table.integer('loan_id').unsigned().nullable();
    });

    await knex.raw(`
      UPDATE transactions t
      JOIN loans l ON l.deposit_txid = t.deposit_txid
      SET t.loan_id = l.id
      WHERE t.deposit_txid IS NOT NULL
    `);

    await knex.schema.alterTable('transactions', (table) => {
      table
        .integer('loan_id')
        .unsigned()
        .references('id')
        .inTable('loans')
        .onDelete('SET NULL');
    });
  }

  // ─────────────────────────────────────
  // 2. DROP deposit_txid FROM TRANSACTIONS
  // ─────────────────────────────────────
  const hasTxDepositTxid = await knex.schema.hasColumn(
    'transactions',
    'deposit_txid',
  );

  if (hasTxDepositTxid) {
    await knex.schema.alterTable('transactions', (table) => {
      table.dropColumn('deposit_txid');
    });
  }

  // ─────────────────────────────────────
  // 3. DROP COLUMNS FROM LOANS
  // ─────────────────────────────────────
  const hasLoanDepositTxid = await knex.schema.hasColumn(
    'loans',
    'deposit_txid',
  );
  const hasLoanEmail = await knex.schema.hasColumn('loans', 'email');

  if (hasLoanDepositTxid || hasLoanEmail) {
    await knex.schema.alterTable('loans', (table) => {
      if (hasLoanDepositTxid) table.dropColumn('deposit_txid');
      if (hasLoanEmail) table.dropColumn('email');
    });
  }
};

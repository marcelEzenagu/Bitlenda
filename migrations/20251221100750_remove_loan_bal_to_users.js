/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasLoanBal = await knex.schema.hasColumn('users', 'loan_bal');
  const hasBal = await knex.schema.hasColumn('users', 'bal');

  // Drop loan_bal only if it exists
  if (hasLoanBal) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('loan_bal');
    });
  }

  // Add bal only if it does NOT exist
  if (!hasBal) {
    await knex.schema.alterTable('users', (table) => {
      table.decimal('bal', 14, 2).notNullable().defaultTo(0);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasLoanBal = await knex.schema.hasColumn('users', 'loan_bal');
  const hasBal = await knex.schema.hasColumn('users', 'bal');

  if (hasBal) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('bal');
    });
  }

  if (!hasLoanBal) {
    await knex.schema.alterTable('users', (table) => {
      table.decimal('loan_bal', 14, 2).notNullable().defaultTo(0);
    });
  }
};

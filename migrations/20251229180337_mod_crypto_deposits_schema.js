/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasAmount = await knex.schema.hasColumn('crypto_deposits', 'amount');

  if (!hasAmount) {
    await knex.schema.alterTable('crypto_deposits', (table) => {
      table.decimal('amount', 14, 2).notNullable();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('crypto_deposits', (table) => {
    table.dropColumn('amount');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasAmount = await knex.schema.hasColumn('transactions', 'to');

  if (!hasAmount) {
    await knex.schema.alterTable('transactions', (table) => {
      table.string('to', 255).nullable();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('transactions', (table) => {
    table.dropColumn('to');
  });
};

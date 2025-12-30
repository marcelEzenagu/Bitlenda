/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasEmail = await knex.schema.hasColumn('loans', 'email');

  // 1. Add column if missing (nullable first)
  if (!hasEmail) {
    await knex.schema.alterTable('loans', (table) => {
      table.string('email', 255).nullable();
    });
  }

  // 3. Make NOT NULL only if no NULLs remain
  const [{ count }] = await knex('loans')
    .whereNull('email')
    .count({ count: '*' });

  if (Number(count) === 0) {
    await knex.schema.alterTable('loans', (table) => {
      table.string('email', 255).notNullable().alter();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasEmail = await knex.schema.hasColumn('loans', 'email');

  if (hasEmail) {
    await knex.schema.alterTable('loans', (table) => {
      table.dropColumn('email');
    });
  }
};

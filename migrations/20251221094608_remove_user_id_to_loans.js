/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasUserId = await knex.schema.hasColumn('loans', 'user_id');
  const hasEmail = await knex.schema.hasColumn('loans', 'email');

  // 1. Ensure email column exists (nullable first)
  if (!hasEmail) {
    await knex.schema.alterTable('loans', (table) => {
      table.string('email', 80).nullable();
    });
  }

  // 2. Backfill email only if user_id exists
  if (hasUserId) {
    await knex.raw(`
      UPDATE loans t
      JOIN users u ON u.id = t.user_id
      SET t.email = u.email
      WHERE t.user_id IS NOT NULL
        AND t.email IS NULL
    `);
  }

  // 3. Drop user_id only if it exists
  if (hasUserId) {
    await knex.schema.alterTable('loans', (table) => {
      table.dropColumn('user_id');
    });
  }

  // 4. Enforce NOT NULL only if safe
  const [{ count }] = await knex('loans')
    .whereNull('email')
    .count({ count: '*' });

  if (Number(count) === 0) {
    await knex.schema.alterTable('loans', (table) => {
      table.string('email', 80).notNullable().alter();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasUserId = await knex.schema.hasColumn('loans', 'user_id');

  if (!hasUserId) {
    await knex.schema.alterTable('loans', (table) => {
      table.string('user_id', 255).nullable();
    });
  }

  await knex.raw(`
    UPDATE loans t
    JOIN users u ON u.email = t.email
    SET t.user_id = u.id
    WHERE t.user_id IS NULL
  `);

  await knex.schema.alterTable('loans', (table) => {
    table.dropColumn('email');
  });
};

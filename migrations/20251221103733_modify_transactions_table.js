/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasEmail = await knex.schema.hasColumn('transactions', 'email');
  const hasDirection = await knex.schema.hasColumn('transactions', 'direction');
  const hasAsset = await knex.schema.hasColumn('transactions', 'asset');
  const hasDescription = await knex.schema.hasColumn(
    'transactions',
    'description',
  );
  const hasUserId = await knex.schema.hasColumn('transactions', 'user_id');

  // 1. Add missing columns only
  if (!hasEmail || !hasDirection || !hasAsset || !hasDescription) {
    await knex.schema.alterTable('transactions', (table) => {
      if (!hasEmail) table.string('email', 255).nullable().index();
      if (!hasDirection) table.string('direction', 40).notNullable();
      if (!hasAsset) table.string('asset', 40).notNullable();
      if (!hasDescription) table.string('description', 255);
    });
  }

  // 2. Backfill email ONLY if user_id exists
  if (hasUserId) {
    await knex.raw(`
      UPDATE transactions t
      JOIN users u ON u.id = t.user_id
      SET t.email = u.email
      WHERE t.email IS NULL
    `);

    // 3. Drop user_id safely
    await knex.schema.alterTable('transactions', (table) => {
      table.dropColumn('user_id');
    });
  }

  // 4. Enforce NOT NULL after backfill
  const emailStillNullable = await knex.schema.hasColumn(
    'transactions',
    'email',
  );

  if (emailStillNullable) {
    await knex.schema.alterTable('transactions', (table) => {
      table.string('email', 255).notNullable().alter();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasUserId = await knex.schema.hasColumn('transactions', 'user_id');
  const hasEmail = await knex.schema.hasColumn('transactions', 'email');

  // 1. Restore user_id if missing
  if (!hasUserId) {
    await knex.schema.alterTable('transactions', (table) => {
      table.integer('user_id').unsigned().nullable();
    });

    await knex.raw(`
      UPDATE transactions t
      JOIN users u ON u.email = t.email
      SET t.user_id = u.id
      WHERE t.email IS NOT NULL
    `);

    await knex.schema.alterTable('transactions', (table) => {
      table.integer('user_id').unsigned().notNullable().alter();
    });
  }

  // 2. Drop added columns safely
  await knex.schema.alterTable('transactions', async (table) => {
    if (hasEmail) table.dropColumn('email');
    if (await knex.schema.hasColumn('transactions', 'asset'))
      table.dropColumn('asset');
    if (await knex.schema.hasColumn('transactions', 'direction'))
      table.dropColumn('direction');
    if (await knex.schema.hasColumn('transactions', 'description'))
      table.dropColumn('description');
  });
};

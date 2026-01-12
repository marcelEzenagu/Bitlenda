/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const next_of_kins = await knex.schema.hasTable('next_of_kins');

  if (!next_of_kins) {
    await knex.schema.createTable('next_of_kins', (table) => {
      table.increments('id').primary();

      table
        .string('user_email', 255)
        .notNullable()
        .references('email')
        .inTable('users')
        .onDelete('CASCADE');

      table.string('full_name', 255).notNullable();
      table.string('relationship', 100).notNullable();
      table.string('phone', 50).notNullable();
      table.string('email', 255).notNullable();

      table.timestamps(true, true);

      // Optional: prevent duplicates
      table.unique(['user_email', 'phone']);
    });
  }

  const hasAltEmail = await knex.schema.hasColumn('users', 'alt_email');

  if (!hasAltEmail) {
    await knex.schema.alterTable('users', (table) => {
      if (!hasAltEmail) {
        table.string('email', 255).nullable();
      }
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('next_of_kins');

  const hasAltEmail = await knex.schema.hasColumn('users', 'alt_email');

  if (hasAltEmail) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('alt_email');
    });
  }
};

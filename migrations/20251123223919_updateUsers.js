/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.date('dob').nullable(); // Date of birth
    table.string('mexc_username').nullable();
    table.double('bal').notNullable().defaultTo(0); // Double / float  });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('dob');
    table.dropColumn('bal');
    table.dropColumn('mexc_username');
  });
};

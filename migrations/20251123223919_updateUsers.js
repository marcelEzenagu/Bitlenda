/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.date('dob').nullable(); // Date of birth
    table.double('loan_bal').nullable(); // Double / float  });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('dob');
    table.dropColumn('loan_bal');
  });
};

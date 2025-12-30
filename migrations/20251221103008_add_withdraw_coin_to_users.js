/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.integer('withdraw_coin').notNullable().defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('withdraw_coin');
  });
};

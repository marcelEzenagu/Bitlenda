/**
 * @param { import("knex").Knex } knex
 */
/**
 */
exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE crypto_deposits
    MODIFY COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT
  `);

  await knex.raw(`
    ALTER TABLE bank_accounts
    MODIFY COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT
  `);

  await knex.raw(`
    ALTER TABLE bank_deposits
    MODIFY COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT
  `);

  await knex.raw(`
    ALTER TABLE fcm_tokens
    MODIFY COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT
  `);
};

/**
 * @param { import("knex").Knex } knex
 */
/**

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE crypto_deposits
    MODIFY COLUMN id VARCHAR(255) NOT NULL
  `);

  await knex.raw(`
    ALTER TABLE bank_accounts
    MODIFY COLUMN id VARCHAR(255) NOT NULL
  `);

  await knex.raw(`
    ALTER TABLE bank_deposits
    MODIFY COLUMN id VARCHAR(255) NOT NULL
  `);

  await knex.raw(`
    ALTER TABLE fcm_tokens
    MODIFY COLUMN id VARCHAR(255) NOT NULL
  `);
};

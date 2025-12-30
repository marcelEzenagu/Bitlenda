exports.up = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE transactions
    MODIFY COLUMN type ENUM(
      'LOAN_DISBURSE',
      'LOAN_REPAY',
      'COIN_DEPOSIT',
      'BANK_DEPOSIT',
      'COIN_WITHDRAW',
      'BANK_WITHDRAW'
    ) NOT NULL
  `);
};

exports.down = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE transactions
    MODIFY COLUMN type ENUM(
      'LOAN_DISBURSE',
      'LOAN_REPAY'
    ) NOT NULL
  `);
};

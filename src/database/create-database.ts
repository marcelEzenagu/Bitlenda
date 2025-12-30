import { knex } from 'knex';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const {
  SELECTED_DB,
  MY_HOST,
  MY_PORT,
  MY_USER,
  MY_PASS,
  PG_HOST,
  PG_PORT,
  PG_USER,
  PG_PASS,
  DB_NAME,
} = process.env;

const dbName = DB_NAME;

export async function createDatabaseIfNotExists() {
  const isPg = SELECTED_DB === 'PGSQL';
  const adminKnex = knex({
    client: isPg ? 'pg' : 'mysql2',
    connection: isPg
      ? {
          host: PG_HOST,
          port: +PG_PORT,
          user: PG_USER,
          database: DB_NAME,

          password: PG_PASS,
          ssl: {
            ca: fs.readFileSync('./cert/pg.pem').toString(),
            rejectUnauthorized: false,
          },
        }
      : {
          host: MY_HOST,
          port: +MY_PORT,
          user: MY_USER,
          password: MY_PASS,
          database: DB_NAME,

          ssl: {
            ca: fs.readFileSync('./cert/ca.pem').toString(),
            rejectUnauthorized: false,
          },
        },
  });

  try {
    if (isPg) {
      const result = await adminKnex
        .select('datname')
        .from('pg_database')
        .where({ datname: dbName });
      if (result.length === 0)
        await adminKnex.raw(`CREATE DATABASE "${dbName}"`);
    } else {
      const result = await adminKnex.raw(`SHOW DATABASES LIKE '${dbName}'`);
      if (result[0].length === 0)
        await adminKnex.raw(`CREATE DATABASE \`${dbName}\``);
    }
    console.log(`Database '${dbName}' verified/created`);
  } finally {
    await adminKnex.destroy();
  }
}

if (require.main === module) {
  createDatabaseIfNotExists()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('DB creation failed:', err.message);
      process.exit(1);
    });
}

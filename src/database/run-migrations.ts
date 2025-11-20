import { knex } from 'knex';
import * as dotenv from 'dotenv';

dotenv.config();
import * as fs from 'fs';
import * as path from 'path';
import { createDatabaseIfNotExists } from './create-database';
const {
  PG_HOST,
  PG_PASS,
  PG_USER,
  PG_PORT,
  MY_PASS,
  MY_HOST,
  MY_USER,
  MY_PORT,
  SELECTED_DB,
  DB_NAME,
} = process.env;
(async () => {
  // await createDatabaseIfNotExists();

  const isPg = process.env.SELECTED_DB === 'PGSQL';

  const db = knex({
    client: isPg ? 'pg' : 'mysql2',
    connection: isPg
      ? {
          host: PG_HOST,
          port: Number(PG_PORT),
          user: PG_USER,
          password: PG_PASS,
          database: DB_NAME,
          ssl: {
            ca: fs.readFileSync('./cert/pg.pem').toString(),
            rejectUnauthorized: false,
          },
        }
      : {
          host: PG_HOST,
          port: Number(PG_PORT),
          user: PG_USER,
          password: PG_PASS,
          database: DB_NAME,

          ssl: {
            ca: fs.readFileSync('./cert/ca.pem').toString(),
            rejectUnauthorized: false,
          },
        },
    migrations: { directory: './migrations' },
  });

  await db.migrate.latest();
  console.log(' All migrations up to date');
  await db.destroy();
})();

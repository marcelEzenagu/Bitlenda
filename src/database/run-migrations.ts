import * as dotenv from 'dotenv';
dotenv.config();
import { knex } from 'knex';

import * as fs from 'fs';
const {
  PG_HOST,
  PG_PASS,
  PG_USER,
  PG_PORT,
  DB_NAME,
  MY_HOST,
  MY_PORT,
  MY_USER,
  MY_PASS,
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
          host: MY_HOST,
          port: Number(MY_PORT),
          user: MY_USER,
          password: MY_PASS,
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

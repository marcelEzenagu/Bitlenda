import { knex, Knex } from 'knex';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();
const pg = require('pg');
export const KNEX_CONNECTION = 'KNEX_CONNECTION';

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
const isPg = SELECTED_DB === 'PGSQL';

export const knexProvider = {
  provide: KNEX_CONNECTION,
  useFactory: async () => {
    // Dynamically resolve CA cert from either src or dist

    const config: Knex.Config = {
      client: isPg ? 'pg' : 'mysql2',
      connection: !isPg
        ? {
            host: MY_HOST,
            //  || 'localhost',
            port: Number(MY_PORT),
            // || 3306,
            user: MY_USER,
            // || 'root',
            password: MY_PASS,
            // || '',
            database: DB_NAME,
            //  || 'testdb',
            ssl:
              MY_HOST == '!localhost'
                ? {
                    ca: fs.readFileSync('./cert/pg.pem').toString(),
                    rejectUnauthorized: false,
                  }
                : false,
          }
        : {
            host: PG_HOST,
            //  || 'localhost',
            port: Number(PG_PORT),
            // || 3306,
            user: PG_USER,
            // || 'root',
            password: PG_PASS,
            // || '',
            database: DB_NAME,
            //  || 'testdb',
            ssl:
              PG_HOST == '!localhost'
                ? {
                    ca: fs.readFileSync('./cert/pg.pem').toString(),
                    rejectUnauthorized: false,
                  }
                : false,
          },
      pool: { min: 2, max: 10 },
      migrations: {
        directory: './migrations',
      },
    };

    // const pgSqlConfig: Knex.Config = {
    //   client: 'pg',
    //   connection: {
    //     host: PG_HOST,
    //     //  || 'localhost',
    //     port: Number(PG_PORT),
    //     // || 3306,
    //     user: PG_USER,
    //     // || 'root',
    //     password: PG_PASS,
    //     // || '',
    //     database: DB_NAME,
    //     //  || 'testdb',
    //     ssl: {
    //       ca: fs.readFileSync('./cert/pg.pem').toString(),
    //       rejectUnauthorized: true,
    //     },
    //   },

    //   pool: { min: 2, max: 10 },
    //   migrations: {
    //     directory: './migrations',
    //   },
    // };

    // let config;
    // if (process.env.SELECTED_DB == 'MYSQL') {
    //   config = mySqlConfig;
    // } else if (process.env.SELECTED_DB == 'PGSQL') {
    //   // config = pgSqlConfig;

    //   const config = {
    //     user: 'USER',
    //     password: 'PASSWORD',
    //     host: 'HOST',
    //     port: 'PORT',
    //     database: 'DATABASE',
    //     ssl: {
    //       rejectUnauthorized: true,
    //       ca: fs.readFileSync('./cert/ca.pem').toString(),
    //     },
    //   };

    //   const client = new pg.Client(config);
    //   client.connect(function (err) {
    //     if (err) throw err;
    //     client.query('SELECT VERSION()', [], function (err, result) {
    //       if (err) throw err;

    //       console.log(result.rows[0]);
    //       client.end(function (err) {
    //         if (err) throw err;
    //       });
    //     });
    //   });
    // }
    const instance = knex(config);

    // Optional: verify connection works
    await instance.raw('SELECT 1');

    console.log('✅ MySQL connection established successfully.');

    return instance;
  },
};

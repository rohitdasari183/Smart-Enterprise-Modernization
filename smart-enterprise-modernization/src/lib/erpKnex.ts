// src/lib/erpKnex.ts
import knex, { Knex } from 'knex';

let _knex: Knex | null = null;

export function getKnex(): Knex {
  if (_knex) return _knex;

  const clientEnv = (process.env.ERP_DB_CLIENT || 'mysql').toLowerCase();
  const client = clientEnv === 'pg' ? 'pg' : clientEnv === 'mssql' ? 'mssql' : 'mysql2';

  _knex = knex({
    client,
    connection: {
      host: process.env.ERP_DB_HOST,
      port: Number(process.env.ERP_DB_PORT || (client === 'pg' ? 5432 : client === 'mysql2' ? 3306 : 1433)),
      user: process.env.ERP_DB_USER,
      password: process.env.ERP_DB_PASSWORD,
      database: process.env.ERP_DB_NAME,
    },
    pool: { min: 0, max: 10 },
  });

  return _knex;
}

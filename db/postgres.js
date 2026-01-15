const { Pool } = require('pg');

let pool;

const getPool = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      const err = new Error('DATABASE_URL is required');
      err.statusCode = 500;
      err.expose = true;
      throw err;
    }

    pool = new Pool({ connectionString, ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined });
  }

  return pool;
};

const pingPostgres = async () => {
  const p = getPool();
  await p.query('SELECT 1');
};

module.exports = {
  getPool,
  pingPostgres,
};

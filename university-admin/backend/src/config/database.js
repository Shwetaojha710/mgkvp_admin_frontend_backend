const sql = require('mssql');
require('dotenv').config();

function cleanEnv(value, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().replace(/^["']|["']$/g, '');
}

/**
 * Connects ONLY to the independent clone DB from .env (e.g. mgkvp_new_admin_clone).
 * Never point DB_NAME at production mgkvp_new / live MGKVP databases.
 * Options mirror a working Sequelize mssql setup: encrypt false + trustServerCertificate.
 */
const dbConfig = {
  server: cleanEnv(process.env.DB_SERVER, 'localhost'),
  port: parseInt(cleanEnv(process.env.DB_PORT, '1433'), 10),
  database: cleanEnv(process.env.DB_NAME, 'mgkvp_new_admin_clone'),
  user: cleanEnv(process.env.DB_USER),
  password: cleanEnv(process.env.DB_PASSWORD),
  options: {
    encrypt: cleanEnv(process.env.DB_ENCRYPT, 'false') === 'true',
    trustServerCertificate: cleanEnv(process.env.DB_TRUST_SERVER_CERTIFICATE, 'true') !== 'false',
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

async function getPool() {
  if (pool) {
    return pool;
  }
  pool = await new sql.ConnectionPool(dbConfig).connect();
  return pool;
}

async function query(queryText, params = {}) {
  const connection = await getPool();
  const request = connection.request();
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  return request.query(queryText);
}

async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

module.exports = {
  sql,
  getPool,
  query,
  closePool,
  dbConfig,
};

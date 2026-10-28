/**
 * Applies database/schema.sql table definitions to the DB named in .env
 * (e.g. mgkvp_new_admin_clone). Skips CREATE DATABASE / USE statements.
 *
 * Usage: node src/utils/applySchema.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('../config/database');

async function applySchema() {
  const schemaPath = path.join(__dirname, '..', '..', '..', 'database', 'schema.sql');
  let sqlText = fs.readFileSync(schemaPath, 'utf8');

  // Remove CREATE DATABASE / USE blocks — we already connect to the clone DB via .env
  sqlText = sqlText
    .replace(/IF DB_ID\([\s\S]*?END\s*GO/gi, '')
    .replace(/USE\s+\w+\s*;?\s*GO/gi, '');

  const batches = sqlText
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter(Boolean);

  const pool = await getPool();
  console.log(`[schema] Applying to database: ${process.env.DB_NAME}`);

  for (let i = 0; i < batches.length; i += 1) {
    try {
      await pool.request().query(batches[i]);
      console.log(`[schema] Batch ${i + 1}/${batches.length} OK`);
    } catch (err) {
      console.error(`[schema] Batch ${i + 1} failed:`, err.message);
      throw err;
    }
  }

  console.log('[schema] Done.');
}

applySchema()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });

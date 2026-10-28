require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('../config/database');

async function run() {
  const file = path.join(__dirname, '..', '..', '..', 'database', 'migrations', '002_cms_entries.sql');
  const sqlText = fs.readFileSync(file, 'utf8');
  const batches = sqlText
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter(Boolean);

  const pool = await getPool();
  for (let i = 0; i < batches.length; i += 1) {
    await pool.request().query(batches[i]);
    console.log(`Batch ${i + 1}/${batches.length} OK`);
  }

  const check = await pool
    .request()
    .query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CmsEntries'");
  console.log('CmsEntries exists:', check.recordset.length > 0);
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });

/**
 * READ-ONLY inspection of MGKVP_WEBSITE_MAIN.
 * Never runs INSERT/UPDATE/DELETE against the source database.
 */
require('dotenv').config();
const sql = require('mssql');

function clean(v, fallback = '') {
  if (v === undefined || v === null || v === '') return fallback;
  return String(v).trim().replace(/^["']|["']$/g, '');
}

async function main() {
  const sourceName = clean(process.env.SOURCE_DB_NAME, 'MGKVP_WEBSITE_MAIN');
  const cloneName = clean(process.env.DB_NAME, 'mgkvp_new_admin_clone');

  if (sourceName.toLowerCase() === cloneName.toLowerCase()) {
    throw new Error('SOURCE_DB_NAME must not equal clone DB_NAME');
  }

  const cfg = {
    server: clean(process.env.DB_SERVER, 'localhost'),
    port: parseInt(clean(process.env.DB_PORT, '1433'), 10),
    database: sourceName,
    user: clean(process.env.DB_USER),
    password: clean(process.env.DB_PASSWORD),
    options: {
      encrypt: clean(process.env.DB_ENCRYPT, 'false') === 'true',
      trustServerCertificate: clean(process.env.DB_TRUST_SERVER_CERTIFICATE, 'true') !== 'false',
      enableArithAbort: true,
      readOnlyIntent: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 60000,
  };

  console.log(`[READ-ONLY] Connecting to ${cfg.server} / ${cfg.database}`);
  const pool = await new sql.ConnectionPool(cfg).connect();

  const tables = await pool.request().query(`
    SELECT TABLE_SCHEMA, TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `);

  console.log(`TABLE_COUNT=${tables.recordset.length}`);
  for (const t of tables.recordset) {
    const full = `${t.TABLE_SCHEMA}.${t.TABLE_NAME}`;
    const countRes = await pool.request().query(`SELECT COUNT(*) AS cnt FROM [${t.TABLE_SCHEMA}].[${t.TABLE_NAME}]`);
    console.log(`${full}\t${countRes.recordset[0].cnt}`);
  }

  // Sample columns for likely content tables
  const interesting = tables.recordset
    .map((t) => t.TABLE_NAME)
    .filter((n) =>
      /banner|news|notice|galler|album|depart|faculty|staff|document|page|marquee|popup|alumni|highlight|button|link|contact|menu|user|admin/i.test(
        n
      )
    );

  console.log('\n--- INTERESTING TABLES (columns) ---');
  for (const name of interesting) {
    const req = pool.request();
    req.input('name', sql.NVarChar, name);
    const cols = await req.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @name
      ORDER BY ORDINAL_POSITION
    `);
    console.log(`\n${name}:`);
    console.log(cols.recordset.map((c) => `${c.COLUMN_NAME}:${c.DATA_TYPE}`).join(', '));
  }

  await pool.close();
  console.log('\n[READ-ONLY] Done. No writes performed on source.');
}

main().catch((err) => {
  console.error('ERR', err.message);
  process.exit(1);
});

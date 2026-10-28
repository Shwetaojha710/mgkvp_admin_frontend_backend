require('dotenv').config();
const sql = require('mssql');

function clean(v, fallback = '') {
  if (v == null || v === '') return fallback;
  return String(v).trim().replace(/^["']|["']$/g, '');
}

(async () => {
  const pool = await new sql.ConnectionPool({
    server: clean(process.env.DB_SERVER),
    port: +clean(process.env.DB_PORT, '1433'),
    database: 'MGKVP_WEBSITE_MAIN',
    user: clean(process.env.DB_USER),
    password: clean(process.env.DB_PASSWORD),
    options: { encrypt: false, trustServerCertificate: true },
  }).connect();

  for (const name of ['ProfessorDetails', 'Contects', 'Dept_Notecboard', 'StudentZoneFront', 'AffiliatedColleges']) {
    const cols = await pool
      .request()
      .input('name', sql.NVarChar, name)
      .query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=@name ORDER BY ORDINAL_POSITION`);
    console.log('\n' + name + ':', cols.recordset.map((c) => c.COLUMN_NAME).join(', '));
  }
  await pool.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

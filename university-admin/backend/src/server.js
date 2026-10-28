require('dotenv').config();
const app = require('./app');
const { getPool } = require('./config/database');

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'replace_with_a_strong_secret') {
    console.warn('[WARN] Set a strong JWT_SECRET in backend/.env before production use.');
  }

  if (process.env.DB_NAME && /mgkvp/i.test(process.env.DB_NAME) && !/clone|adminclone|universityadmin/i.test(process.env.DB_NAME)) {
    console.error('[FATAL] Refusing to start: DB_NAME looks like a production MGKVP database.');
    console.error('Use UniversityAdminClone (or another dedicated clone database name).');
    process.exit(1);
  }

  try {
    await getPool();
    console.log(`[DB] Connected to ${process.env.DB_NAME || 'UniversityAdminClone'} (clone database only)`);
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    console.error('Configure backend/.env and run database/schema.sql first.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[API] University Admin Clone listening on http://localhost:${PORT}`);
    console.log(`[API] Health: http://localhost:${PORT}/api/health`);
  });
}

start();

/**
 * Seeds default Admin + Webmaster + Faculty + Head users on the clone DB only.
 * Does NOT touch production mgkvp.ac.in database.
 *
 * Usage: cd backend && npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, closePool } = require('../config/database');

const USERS = [
  {
    username: process.env.SEED_ADMIN_USERNAME || 'admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@university.local',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    fullName: process.env.SEED_ADMIN_NAME || 'Admin Master',
    role: 'admin',
  },
  {
    username: process.env.SEED_WEBMASTER_USERNAME || 'webmaster',
    email: process.env.SEED_WEBMASTER_EMAIL || 'webmaster@university.local',
    password: process.env.SEED_WEBMASTER_PASSWORD || 'Webmaster@12345',
    fullName: process.env.SEED_WEBMASTER_NAME || 'Webmaster Admin',
    role: 'webmaster',
  },
  {
    username: process.env.SEED_FACULTY_USERNAME || 'faculty',
    email: process.env.SEED_FACULTY_EMAIL || 'faculty@university.local',
    password: process.env.SEED_FACULTY_PASSWORD || 'Faculty@12345',
    fullName: process.env.SEED_FACULTY_NAME || 'Faculty Admin',
    role: 'faculty',
  },
  {
    username: process.env.SEED_HEAD_USERNAME || 'head',
    email: process.env.SEED_HEAD_EMAIL || 'head@university.local',
    password: process.env.SEED_HEAD_PASSWORD || 'Head@12345',
    fullName: process.env.SEED_HEAD_NAME || 'Department Head',
    role: 'head',
  },
];

async function upsertUser(user, passwordHash) {
  const existing = await query(
    `SELECT Id FROM dbo.Administrators WHERE Username = @username OR Email = @email`,
    { username: user.username, email: user.email }
  );

  if (existing.recordset.length) {
    await query(
      `
      UPDATE dbo.Administrators
      SET PasswordHash = @passwordHash,
          FullName = @fullName,
          Role = @role,
          Email = @email,
          Username = @username,
          IsActive = 1,
          UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @id
      `,
      {
        id: existing.recordset[0].Id,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        username: user.username,
      }
    );
    console.log(`Updated ${user.role}: ${user.username}`);
  } else {
    await query(
      `
      INSERT INTO dbo.Administrators (Username, Email, PasswordHash, FullName, Role, IsActive)
      VALUES (@username, @email, @passwordHash, @fullName, @role, 1)
      `,
      {
        username: user.username,
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
      }
    );
    console.log(`Created ${user.role}: ${user.username}`);
  }
}

async function seed() {
  if (process.env.DB_NAME && /mgkvp/i.test(process.env.DB_NAME) && !/clone|adminclone|universityadmin/i.test(process.env.DB_NAME)) {
    throw new Error('Refusing to seed: DB_NAME looks like a production MGKVP database.');
  }

  for (const user of USERS) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await upsertUser(user, passwordHash);
  }

  const dept = await query(`SELECT Id FROM dbo.Departments WHERE Name = @name`, { name: 'MGKVP' });
  if (!dept.recordset.length) {
    await query(
      `
      INSERT INTO dbo.Departments (Name, Code, Description, IsActive)
      VALUES (N'MGKVP', N'MGKVP', N'Mahatma Gandhi Kashi Vidyapith', 1)
      `
    );
    console.log('Created default department: MGKVP');
  }

  console.log('---');
  console.log('Login credentials (clone DB only):');
  for (const user of USERS) {
    console.log(`  [${user.role}] ${user.username} / ${user.password}`);
  }
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });

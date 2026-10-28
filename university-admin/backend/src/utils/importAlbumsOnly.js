/**
 * READ-ONLY: import Albums + AcademicEventAlbum into clone CmsEntries only.
 * Does not modify MGKVP_WEBSITE_MAIN.
 */
require('dotenv').config();
const sql = require('mssql');

function clean(v, fallback = '') {
  if (v == null || v === '') return fallback;
  return String(v).trim().replace(/^["']|["']$/g, '');
}

function trunc(v, max = 500) {
  if (v == null) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

function base(database) {
  return {
    server: clean(process.env.DB_SERVER),
    port: +clean(process.env.DB_PORT, '1433'),
    database,
    user: clean(process.env.DB_USER),
    password: clean(process.env.DB_PASSWORD),
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
    requestTimeout: 120000,
  };
}

async function main() {
  const SOURCE = clean(process.env.SOURCE_DB_NAME, 'MGKVP_WEBSITE_MAIN');
  const CLONE = clean(process.env.DB_NAME, 'mgkvp_new_admin_clone');
  if (SOURCE.toLowerCase() === CLONE.toLowerCase()) throw new Error('Source and clone must differ');

  const source = await new sql.ConnectionPool({
    ...base(SOURCE),
    options: { ...base(SOURCE).options, readOnlyIntent: true },
  }).connect();
  const clone = await new sql.ConnectionPool(base(CLONE)).connect();

  try {
    const admin = await clone.request().query('SELECT TOP 1 Id FROM dbo.Administrators ORDER BY Id');
    const adminId = admin.recordset[0]?.Id;
    if (!adminId) throw new Error('No admin in clone DB — run npm run seed first');

    const depts = await clone.request().query('SELECT Id, Code FROM dbo.Departments');
    // Source DeptId was remapped; best-effort: match by Code == source id string or skip dept
    const deptByCode = new Map(depts.recordset.map((d) => [String(d.Code), d.Id]));

    await clone.request().query(`DELETE FROM dbo.CmsEntries WHERE ModuleKey IN (N'album', N'academic-event-album')`);

    const albums = await source.request().query(`
      SELECT Id, DeptId, Name, ImgName, Type, IsActive FROM dbo.Albums ORDER BY Id
    `);

    let n = 0;
    for (const row of albums.recordset) {
      const deptId = deptByCode.get(String(row.DeptId)) || null;
      await clone
        .request()
        .input('moduleKey', sql.NVarChar, 'album')
        .input('departmentId', sql.Int, deptId)
        .input('title', sql.NVarChar, trunc(row.Name || `Album ${row.Id}`, 500))
        .input('caption', sql.NVarChar, trunc(row.Type, 1000))
        .input('imagePath', sql.NVarChar, trunc(row.ImgName, 500))
        .input('imageName', sql.NVarChar, trunc(row.ImgName ? String(row.ImgName).split(/[/\\]/).pop() : null, 255))
        .input('isPublished', sql.Bit, Boolean(row.IsActive))
        .input('userId', sql.Int, adminId)
        .query(`
          INSERT INTO dbo.CmsEntries
            (ModuleKey, DepartmentId, Title, Caption, ImagePath, ImageName, Priority, IsPublished, Category, CreatedBy, UpdatedBy)
          VALUES
            (@moduleKey, @departmentId, @title, @caption, @imagePath, @imageName, 0, @isPublished, N'album', @userId, @userId)
        `);
      n += 1;
    }

    let a = 0;
    try {
      const academic = await source.request().query(`
        SELECT Id, Name, ImgName, Type, IsActive FROM dbo.AcademicEventAlbum WHERE ISNULL(Isdeleted,0)=0
      `);
      for (const row of academic.recordset) {
        await clone
          .request()
          .input('moduleKey', sql.NVarChar, 'academic-event-album')
          .input('title', sql.NVarChar, trunc(row.Name || `Academic Album ${row.Id}`, 500))
          .input('caption', sql.NVarChar, trunc(row.Type, 1000))
          .input('imagePath', sql.NVarChar, trunc(row.ImgName, 500))
          .input('isPublished', sql.Bit, Boolean(row.IsActive))
          .input('userId', sql.Int, adminId)
          .query(`
            INSERT INTO dbo.CmsEntries
              (ModuleKey, Title, Caption, ImagePath, Priority, IsPublished, Category, CreatedBy, UpdatedBy)
            VALUES
              (@moduleKey, @title, @caption, @imagePath, 0, @isPublished, N'academic-album', @userId, @userId)
          `);
        a += 1;
      }
    } catch (err) {
      console.log('AcademicEventAlbum:', err.message);
    }

    console.log(`Imported album CMS rows: ${n}`);
    console.log(`Imported academic-event-album CMS rows: ${a}`);
    console.log('Source DB was not modified.');
  } finally {
    await source.close();
    await clone.close();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

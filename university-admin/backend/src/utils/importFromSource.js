/**
 * READ-ONLY import from MGKVP_WEBSITE_MAIN → mgkvp_new_admin_clone
 *
 * - Source DB: SELECT only (never INSERT/UPDATE/DELETE)
 * - Clone DB: all writes happen here
 * - Refuses to run if SOURCE_DB_NAME looks like the clone, or if clone name is the source
 *
 * Usage:
 *   cd backend
 *   npm run import:source
 */
require('dotenv').config();
const sql = require('mssql');

function clean(v, fallback = '') {
  if (v === undefined || v === null || v === '') return fallback;
  return String(v).trim().replace(/^["']|["']$/g, '');
}

function bool(v, fallback = false) {
  if (v === null || v === undefined) return fallback;
  return Boolean(v);
}

function trunc(v, max = 500) {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

function baseConfig(database) {
  return {
    server: clean(process.env.DB_SERVER, 'localhost'),
    port: parseInt(clean(process.env.DB_PORT, '1433'), 10),
    database,
    user: clean(process.env.DB_USER),
    password: clean(process.env.DB_PASSWORD),
    options: {
      encrypt: clean(process.env.DB_ENCRYPT, 'false') === 'true',
      trustServerCertificate: clean(process.env.DB_TRUST_SERVER_CERTIFICATE, 'true') !== 'false',
      enableArithAbort: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 120000,
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
  };
}

const SOURCE_DB = clean(process.env.SOURCE_DB_NAME, 'MGKVP_WEBSITE_MAIN');
const CLONE_DB = clean(process.env.DB_NAME, 'mgkvp_new_admin_clone');

const stats = {};

function bump(key, n = 1) {
  stats[key] = (stats[key] || 0) + n;
}

async function assertSafety() {
  if (!SOURCE_DB || !CLONE_DB) {
    throw new Error('SOURCE_DB_NAME and DB_NAME are required');
  }
  if (SOURCE_DB.toLowerCase() === CLONE_DB.toLowerCase()) {
    throw new Error('SOURCE_DB_NAME and DB_NAME must be different databases');
  }
  if (!/clone|admin_clone|adminclone/i.test(CLONE_DB)) {
    throw new Error(`Refusing write target "${CLONE_DB}" — clone DB name must contain "clone"`);
  }
  if (/clone/i.test(SOURCE_DB)) {
    throw new Error(`SOURCE_DB_NAME "${SOURCE_DB}" looks like a clone DB — aborting`);
  }
}

async function selectAll(sourcePool, queryText) {
  // Hard rule: only SELECT against source
  const normalized = queryText.trim().replace(/^\/\*[\s\S]*?\*\//, '').trim();
  if (!/^SELECT\b/i.test(normalized)) {
    throw new Error('Source connection may only run SELECT queries');
  }
  const result = await sourcePool.request().query(queryText);
  return result.recordset;
}

async function clearCloneTable(clonePool, table) {
  await clonePool.request().query(`DELETE FROM dbo.${table}`);
}

/** Wipe clone content tables in FK-safe order (never touches source). */
async function clearCloneContent(clonePool) {
  const order = [
    'GalleryImages',
    'Galleries',
    'Banners',
    'NewsEvents',
    'Documents',
    'Notices',
    'Faculty',
    'Pages',
    'CmsEntries',
    'UploadedFiles',
    'Departments',
  ];
  for (const table of order) {
    try {
      await clearCloneTable(clonePool, table);
      console.log(`  cleared clone dbo.${table}`);
    } catch (err) {
      console.log(`  skip clear ${table}: ${err.message}`);
    }
  }
}

async function ensureAdmin(clonePool) {
  const existing = await clonePool
    .request()
    .query(`SELECT TOP 1 Id FROM dbo.Administrators ORDER BY Id`);
  if (existing.recordset[0]) return existing.recordset[0].Id;

  // Should already be seeded; create a placeholder admin if missing
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('Admin@12345', 12);
  const inserted = await clonePool
    .request()
    .input('hash', sql.NVarChar, hash)
    .query(`
      INSERT INTO dbo.Administrators (Username, Email, PasswordHash, FullName, Role, IsActive)
      OUTPUT INSERTED.Id
      VALUES (N'admin', N'admin@university.local', @hash, N'Admin Master', N'admin', 1)
    `);
  return inserted.recordset[0].Id;
}

async function importDepartments(sourcePool, clonePool, adminId) {
  const rows = await selectAll(
    sourcePool,
    `
    SELECT Id, DeptName, Contact, EmailId, IsActive, Dept_Url_Name
    FROM dbo.Departments
    WHERE DeptName IS NOT NULL AND LTRIM(RTRIM(DeptName)) <> ''
    ORDER BY Id
    `
  );

  const map = new Map();

  const usedNames = new Set();
  for (const row of rows) {
    let name = trunc(row.DeptName, 200);
    if (usedNames.has(name.toLowerCase())) {
      name = trunc(`${row.DeptName} (${row.Id})`, 200);
    }
    usedNames.add(name.toLowerCase());

    const result = await clonePool
      .request()
      .input('name', sql.NVarChar, name)
      .input('code', sql.NVarChar, trunc(row.Dept_Url_Name || String(row.Id), 50))
      .input('description', sql.NVarChar, trunc([row.Contact, row.EmailId].filter(Boolean).join(' | '), 1000))
      .input('isActive', sql.Bit, bool(row.IsActive, true))
      .input('userId', sql.Int, adminId)
      .query(`
        INSERT INTO dbo.Departments (Name, Code, Description, IsActive, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.Id
        VALUES (@name, @code, @description, @isActive, @userId, @userId)
      `);
    map.set(row.Id, result.recordset[0].Id);
    bump('Departments');
  }

  console.log(`  Departments: ${rows.length} imported`);
  return map;
}

async function importBanners(sourcePool, clonePool, deptMap, adminId) {
  const rows = await selectAll(
    sourcePool,
    `
    SELECT Id, Title, Caption, ImageURL, IsActive, DeptId, Priority, IsDeleted, FileType
    FROM dbo.Banners
    WHERE ISNULL(IsDeleted, 0) = 0
    ORDER BY Id
    `
  );

  for (const row of rows) {
    await clonePool
      .request()
      .input('departmentId', sql.Int, deptMap.get(row.DeptId) || null)
      .input('title', sql.NVarChar, trunc(row.Title || 'Banner', 300))
      .input('caption', sql.NVarChar, trunc(row.Caption, 500))
      .input('imagePath', sql.NVarChar, trunc(row.ImageURL, 500))
      .input('imageName', sql.NVarChar, trunc(row.ImageURL ? String(row.ImageURL).split(/[/\\]/).pop() : null, 255))
      .input('imageType', sql.NVarChar, trunc(row.FileType, 100))
      .input('priority', sql.Int, row.Priority || 0)
      .input('isActive', sql.Bit, bool(row.IsActive, false))
      .input('userId', sql.Int, adminId)
      .query(`
        INSERT INTO dbo.Banners
          (DepartmentId, Title, Caption, ImagePath, ImageName, ImageType, Priority, IsActive, CreatedBy, UpdatedBy)
        VALUES
          (@departmentId, @title, @caption, @imagePath, @imageName, @imageType, @priority, @isActive, @userId, @userId)
      `);
    bump('Banners');
  }
  console.log(`  Banners: ${rows.length} imported`);
}

async function importNewsEvents(sourcePool, clonePool, deptMap, adminId) {
  const rows = await selectAll(
    sourcePool,
    `
    SELECT Id, Title, Description, NavigateUrl, IsNew, SystemDate, DeptId, URL, Type
    FROM dbo.NewsEvents
    ORDER BY Id
    `
  );

  for (const row of rows) {
    await clonePool
      .request()
      .input('departmentId', sql.Int, deptMap.get(row.DeptId) || null)
      .input('title', sql.NVarChar, trunc(row.Title || 'News', 500))
      .input('summary', sql.NVarChar, trunc(row.Description, 1000))
      .input('content', sql.NVarChar(sql.MAX), row.Description || null)
      .input('eventDate', sql.Date, row.SystemDate || null)
      .input('imagePath', sql.NVarChar, trunc(row.URL || row.NavigateUrl, 500))
      .input('imageName', sql.NVarChar, trunc((row.URL || row.NavigateUrl || '').split(/[/\\]/).pop() || null, 255))
      .input('priority', sql.Int, bool(row.IsNew) ? 1 : 0)
      .input('isPublished', sql.Bit, true)
      .input('userId', sql.Int, adminId)
      .query(`
        INSERT INTO dbo.NewsEvents
          (DepartmentId, Title, Summary, Content, EventDate, ImagePath, ImageName, Priority, IsPublished, CreatedBy, UpdatedBy)
        VALUES
          (@departmentId, @title, @summary, @content, @eventDate, @imagePath, @imageName, @priority, @isPublished, @userId, @userId)
      `);
    bump('NewsEvents');
  }
  console.log(`  NewsEvents: ${rows.length} imported`);
}

async function importGalleries(sourcePool, clonePool, deptMap, adminId) {
  const albums = await selectAll(
    sourcePool,
    `
    SELECT Id, DeptId, Name, ImgName, Type, IsActive
    FROM dbo.Albums
    ORDER BY Id
    `
  );

  const albumMap = new Map();

  for (const row of albums) {
    const result = await clonePool
      .request()
      .input('departmentId', sql.Int, deptMap.get(row.DeptId) || null)
      .input('title', sql.NVarChar, trunc(row.Name || `Album ${row.Id}`, 300))
      .input('description', sql.NVarChar, trunc(row.Type, 1000))
      .input('coverImagePath', sql.NVarChar, trunc(row.ImgName, 500))
      .input('coverImageName', sql.NVarChar, trunc(row.ImgName ? String(row.ImgName).split(/[/\\]/).pop() : null, 255))
      .input('isPublished', sql.Bit, bool(row.IsActive, true))
      .input('userId', sql.Int, adminId)
      .query(`
        INSERT INTO dbo.Galleries
          (DepartmentId, Title, Description, CoverImagePath, CoverImageName, IsPublished, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.Id
        VALUES
          (@departmentId, @title, @description, @coverImagePath, @coverImageName, @isPublished, @userId, @userId)
      `);
    albumMap.set(row.Id, result.recordset[0].Id);
    bump('Galleries');
  }

  const images = await selectAll(
    sourcePool,
    `
    SELECT Id, AlbumId, Title, Description, Type, IsActive, URL
    FROM dbo.Galleries
    WHERE URL IS NOT NULL AND LTRIM(RTRIM(URL)) <> ''
    ORDER BY Id
    `
  );

  let imageCount = 0;
  for (const row of images) {
    const galleryId = albumMap.get(row.AlbumId);
    if (!galleryId) continue;
    await clonePool
      .request()
      .input('galleryId', sql.Int, galleryId)
      .input('title', sql.NVarChar, trunc(row.Title, 300))
      .input('imagePath', sql.NVarChar, trunc(row.URL, 500))
      .input('imageName', sql.NVarChar, trunc(String(row.URL).split(/[/\\]/).pop(), 255))
      .input('imageType', sql.NVarChar, trunc(row.Type, 100))
      .input('sortOrder', sql.Int, 0)
      .query(`
        INSERT INTO dbo.GalleryImages (GalleryId, Title, ImagePath, ImageName, ImageType, SortOrder)
        VALUES (@galleryId, @title, @imagePath, @imageName, @imageType, @sortOrder)
      `);
    imageCount += 1;
    bump('GalleryImages');
  }

  console.log(`  Galleries(albums): ${albums.length}, GalleryImages: ${imageCount} imported`);
}

async function importDocuments(sourcePool, clonePool, deptMap, adminId) {
  const rows = await selectAll(
    sourcePool,
    `
    SELECT DocumentID AS Id, Title, FileType, URL, DeptID, IsDeleted, IsActive, UploadDate
    FROM dbo.Dept_Document
    WHERE ISNULL(IsDeleted, 0) = 0 AND Title IS NOT NULL
    UNION ALL
    SELECT Id, Title, FileType, URL, NULL AS DeptID, IsDeleted, CAST(IsActive AS bit) AS IsActive, CreatedDate AS UploadDate
    FROM dbo.UniversityDocuments
    WHERE ISNULL(IsDeleted, 0) = 0 AND Title IS NOT NULL
    `
  );

  for (const row of rows) {
    await clonePool
      .request()
      .input('departmentId', sql.Int, deptMap.get(row.DeptID) || null)
      .input('title', sql.NVarChar, trunc(row.Title, 500))
      .input('category', sql.NVarChar, trunc(row.FileType, 150))
      .input('description', sql.NVarChar, null)
      .input('filePath', sql.NVarChar, trunc(row.URL, 500))
      .input('fileName', sql.NVarChar, trunc(row.URL ? String(row.URL).split(/[/\\]/).pop() : null, 255))
      .input('fileType', sql.NVarChar, trunc(row.FileType, 100))
      .input('fileSize', sql.BigInt, null)
      .input('isPublished', sql.Bit, bool(row.IsActive, true))
      .input('userId', sql.Int, adminId)
      .query(`
        INSERT INTO dbo.Documents
          (DepartmentId, Title, Category, Description, FilePath, FileName, FileType, FileSize, IsPublished, CreatedBy, UpdatedBy)
        VALUES
          (@departmentId, @title, @category, @description, @filePath, @fileName, @fileType, @fileSize, @isPublished, @userId, @userId)
      `);
    bump('Documents');
  }
  console.log(`  Documents: ${rows.length} imported`);
}

async function importNotices(sourcePool, clonePool, deptMap, adminId) {
  const rows = await selectAll(
    sourcePool,
    `
    SELECT Id, Notice_Board, URL, Type, IsActive, CreatedDate, Date, IsDeleted
    FROM dbo.Dept_Notecboard
    WHERE ISNULL(IsDeleted, 0) = 0 AND Notice_Board IS NOT NULL
    `
  );

  for (const row of rows) {
    await clonePool
      .request()
      .input('departmentId', sql.Int, null)
      .input('title', sql.NVarChar, trunc(row.Notice_Board, 500))
      .input('description', sql.NVarChar, null)
      .input('category', sql.NVarChar, trunc(row.Type || 'Notice', 100))
      .input('filePath', sql.NVarChar, trunc(row.URL, 500))
      .input('fileName', sql.NVarChar, trunc(row.URL ? String(row.URL).split(/[/\\]/).pop() : null, 255))
      .input('fileType', sql.NVarChar, null)
      .input('publishDate', sql.Date, row.Date || row.CreatedDate || null)
      .input('isPublished', sql.Bit, bool(row.IsActive, true))
      .input('userId', sql.Int, adminId)
      .query(`
        INSERT INTO dbo.Notices
          (DepartmentId, Title, Description, Category, FilePath, FileName, FileType, PublishDate, IsPublished, CreatedBy, UpdatedBy)
        VALUES
          (@departmentId, @title, @description, @category, @filePath, @fileName, @fileType, @publishDate, @isPublished, @userId, @userId)
      `);
    bump('Notices');
  }
  console.log(`  Notices: ${rows.length} imported`);
}

async function importFaculty(sourcePool, clonePool, deptMap, adminId) {
  const professors = await selectAll(
    sourcePool,
    `
    SELECT Id, DeptId, Name, Designation, Qualification, URL, Email_Id, ContactNo, OtherDetails, IsActive
    FROM dbo.ProfessorDetails
    WHERE ISNULL(IsDeleted, 0) = 0 AND Name IS NOT NULL
    `
  );

  let staff = [];
  try {
    staff = await selectAll(
      sourcePool,
      `
      SELECT Id, DeptId, Name, Designation, Qualification, URL, Email_Id, Phone_no AS ContactNo, NULL AS OtherDetails, IsActive
      FROM dbo.NonTeachingStaffNSSes
      WHERE ISNULL(isdeleted, 0) = 0 AND Name IS NOT NULL
      `
    );
  } catch {
    staff = [];
  }

  const all = [...professors, ...staff];
  for (const row of all) {
    await clonePool
      .request()
      .input('departmentId', sql.Int, deptMap.get(row.DeptId) || null)
      .input('fullName', sql.NVarChar, trunc(row.Name, 200))
      .input('designation', sql.NVarChar, trunc(row.Designation || row.Qualification, 150))
      .input('email', sql.NVarChar, trunc(row.Email_Id, 255))
      .input('phone', sql.NVarChar, trunc(row.ContactNo, 50))
      .input('bio', sql.NVarChar, trunc([row.Qualification, row.OtherDetails].filter(Boolean).join('\n'), 4000))
      .input('photoPath', sql.NVarChar, trunc(row.URL, 500))
      .input('photoName', sql.NVarChar, trunc(row.URL ? String(row.URL).split(/[/\\]/).pop() : null, 255))
      .input('isActive', sql.Bit, bool(row.IsActive, true))
      .input('userId', sql.Int, adminId)
      .query(`
        INSERT INTO dbo.Faculty
          (DepartmentId, FullName, Designation, Email, Phone, Bio, PhotoPath, PhotoName, IsActive, CreatedBy, UpdatedBy)
        VALUES
          (@departmentId, @fullName, @designation, @email, @phone, @bio, @photoPath, @photoName, @isActive, @userId, @userId)
      `);
    bump('Faculty');
  }
  console.log(`  Faculty: ${all.length} imported`);
}

async function importPages(sourcePool, clonePool, adminId) {
  const rows = await selectAll(
    sourcePool,
    `
    SELECT Id, Type, Content, Isdeleted
    FROM dbo.UniversityPages
    WHERE ISNULL(Isdeleted, 0) = 0
    `
  );

  for (const row of rows) {
    const title = trunc(row.Type || `Page ${row.Id}`, 300);
    const slug = String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `page-${row.Id}`;

    await clonePool
      .request()
      .input('title', sql.NVarChar, title)
      .input('slug', sql.NVarChar, trunc(`${slug}-${row.Id}`, 300))
      .input('content', sql.NVarChar(sql.MAX), row.Content || null)
      .input('category', sql.NVarChar, 'University')
      .input('isPublished', sql.Bit, true)
      .input('userId', sql.Int, adminId)
      .query(`
        INSERT INTO dbo.Pages (Title, Slug, Content, Category, IsPublished, CreatedBy, UpdatedBy)
        VALUES (@title, @slug, @content, @category, @isPublished, @userId, @userId)
      `);
    bump('Pages');
  }
  console.log(`  Pages: ${rows.length} imported`);
}

async function insertCms(clonePool, moduleKey, data, adminId, deptMap) {
  await clonePool
    .request()
    .input('moduleKey', sql.NVarChar, moduleKey)
    .input('departmentId', sql.Int, data.departmentId ? deptMap.get(data.departmentId) || null : null)
    .input('title', sql.NVarChar, trunc(data.title || 'Untitled', 500))
    .input('caption', sql.NVarChar, trunc(data.caption, 1000))
    .input('description', sql.NVarChar(sql.MAX), data.description || null)
    .input('category', sql.NVarChar, trunc(data.category, 150))
    .input('linkUrl', sql.NVarChar, trunc(data.linkUrl, 1000))
    .input('imagePath', sql.NVarChar, trunc(data.imagePath, 500))
    .input('imageName', sql.NVarChar, trunc(data.imageName, 255))
    .input('filePath', sql.NVarChar, trunc(data.filePath, 500))
    .input('fileName', sql.NVarChar, trunc(data.fileName, 255))
    .input('fileType', sql.NVarChar, trunc(data.fileType, 100))
    .input('priority', sql.Int, data.priority || 0)
    .input('isPublished', sql.Bit, bool(data.isPublished, true))
    .input('publishDate', sql.Date, data.publishDate || null)
    .input('userId', sql.Int, adminId)
    .query(`
      INSERT INTO dbo.CmsEntries
        (ModuleKey, DepartmentId, Title, Caption, Description, Category, LinkUrl,
         ImagePath, ImageName, FilePath, FileName, FileType, Priority, IsPublished, PublishDate,
         CreatedBy, UpdatedBy)
      VALUES
        (@moduleKey, @departmentId, @title, @caption, @description, @category, @linkUrl,
         @imagePath, @imageName, @filePath, @fileName, @fileType, @priority, @isPublished, @publishDate,
         @userId, @userId)
    `);
  bump(`Cms:${moduleKey}`);
}

async function importCmsModules(sourcePool, clonePool, deptMap, adminId) {
  // Albums (HOME > ALBUM) — also kept in dbo.Galleries; CMS copy for /admin/m/album
  for (const row of await selectAll(
    sourcePool,
    `SELECT Id, DeptId, Name, ImgName, Type, IsActive FROM dbo.Albums ORDER BY Id`
  )) {
    await insertCms(clonePool, 'album', {
      title: row.Name || `Album ${row.Id}`,
      caption: row.Type,
      imagePath: row.ImgName,
      imageName: row.ImgName ? String(row.ImgName).split(/[/\\]/).pop() : null,
      departmentId: row.DeptId,
      isPublished: bool(row.IsActive, true),
      category: 'album',
    }, adminId, deptMap);
  }

  // Academic event albums
  try {
    for (const row of await selectAll(
      sourcePool,
      `SELECT Id, Name, ImgName, Type, IsActive FROM dbo.AcademicEventAlbum WHERE ISNULL(Isdeleted,0)=0`
    )) {
      await insertCms(clonePool, 'academic-event-album', {
        title: row.Name || `Academic Album ${row.Id}`,
        caption: row.Type,
        imagePath: row.ImgName,
        isPublished: bool(row.IsActive, true),
        category: 'academic-album',
      }, adminId, deptMap);
    }
  } catch (err) {
    console.log(`  AcademicEventAlbum skipped: ${err.message}`);
  }

  // Noble alumni
  for (const row of await selectAll(sourcePool, `SELECT * FROM dbo.Noble_Alumni`)) {
    await insertCms(clonePool, 'noble-alumni', {
      title: row.Name,
      caption: row.Designation,
      description: row.OtherDetails,
      linkUrl: row.URL,
      imagePath: row.URL,
      priority: row.Priority || 0,
      isPublished: true,
    }, adminId, deptMap);
  }

  // Marquee
  for (const row of await selectAll(sourcePool, `SELECT * FROM dbo.Marquees WHERE ISNULL(IsActive,1)=1`)) {
    await insertCms(clonePool, 'marquee', {
      title: row.Title,
      linkUrl: row.NavigateURL,
      priority: row.Priority || 0,
      isPublished: bool(row.IsActive, true),
    }, adminId, deptMap);
  }

  // Popup
  for (const row of await selectAll(sourcePool, `SELECT * FROM dbo.PopUpMarquee WHERE ISNULL(IsDeleted,0)=0`)) {
    await insertCms(clonePool, 'popup', {
      title: row.Title,
      description: row.Description,
      imagePath: row.Image,
      linkUrl: row.URL,
      caption: row.ButtonName,
      priority: row.Priority || 0,
      isPublished: bool(row.IsDisplay, true),
    }, adminId, deptMap);
  }

  // Buttons
  for (const row of await selectAll(sourcePool, `SELECT * FROM dbo.HomePageButtions`)) {
    await insertCms(clonePool, 'button', {
      title: row.Heading,
      caption: row.SubHeading,
      linkUrl: row.Url,
      imagePath: row.ImageIcon,
      priority: row.Priority || 0,
      isPublished: bool(row.IsActive, true),
    }, adminId, deptMap);
  }

  // Highlights
  for (const row of await selectAll(sourcePool, `SELECT * FROM dbo.HomePageHighlights`)) {
    await insertCms(clonePool, 'highlights', {
      title: row.Heading1 || `Highlight ${row.Id}`,
      description: [row.Heading1, row.Heading2, row.Heading3, row.Heading4].filter(Boolean).join(' | '),
      linkUrl: row.Heading1Url,
      priority: row.Priority || 0,
      isPublished: bool(row.IsActive, true),
    }, adminId, deptMap);
  }

  // E-newspaper
  for (const row of await selectAll(sourcePool, `SELECT * FROM dbo.Enewspapers WHERE ISNULL(IsDeleted,0)=0`)) {
    await insertCms(clonePool, 'e-newspaper', {
      title: row.Title,
      filePath: row.URL,
      fileName: row.URL ? String(row.URL).split(/[/\\]/).pop() : null,
      fileType: row.Type,
      departmentId: row.DeptId,
      isPublished: true,
      publishDate: row.CreatedDate,
    }, adminId, deptMap);
  }

  // Useful links
  for (const row of await selectAll(sourcePool, `SELECT * FROM dbo.UsefulLinks WHERE ISNULL(IsDeleted,0)=0`)) {
    await insertCms(clonePool, 'useful-links', {
      title: row.Title,
      imagePath: row.Image,
      linkUrl: row.URL,
      priority: row.Priority || 0,
      isPublished: true,
    }, adminId, deptMap);
  }

  // Contacts
  for (const row of await selectAll(
    sourcePool,
    `SELECT * FROM dbo.Contects WHERE ISNULL(IsDeleted,0)=0`
  )) {
    await insertCms(clonePool, 'contacts', {
      title: row.Name || `Contact ${row.Id}`,
      caption: row.Designation,
      description: [row.Email, row.Mobile_No].filter(Boolean).join(' | '),
      linkUrl: row.Email,
      priority: row.Priority || 0,
      isPublished: bool(row.IsActive, true),
    }, adminId, deptMap);
  }

  // Student zone
  for (const row of await selectAll(
    sourcePool,
    `SELECT * FROM dbo.StudentZoneFront WHERE ISNULL(Isdeleted,0)=0`
  )) {
    await insertCms(clonePool, 'home-student-zone', {
      title: row.Title || row.Heading || row.ZoneName || `Item ${row.Id}`,
      caption: row.Button || row.ZoneName,
      linkUrl: row.URL,
      imagePath: row.Icon,
      priority: row.Priority || 0,
      isPublished: true,
      category: row.Type,
    }, adminId, deptMap);
  }

  // Menus → menu-list
  for (const row of await selectAll(sourcePool, `SELECT * FROM dbo.Menus WHERE ISNULL(IsDeleted,0)=0`)) {
    await insertCms(clonePool, 'menu-list', {
      title: row.Title,
      linkUrl: row.URL,
      caption: row.Icon,
      priority: row.DisplaySerial || 0,
      isPublished: bool(row.IsActive, true),
      category: row.ParentID ? `parent:${row.ParentID}` : 'root',
    }, adminId, deptMap);
  }

  // Affiliated colleges
  for (const row of await selectAll(
    sourcePool,
    `SELECT * FROM dbo.AffiliatedColleges WHERE ISNULL(IsDeleted,0)=0`
  )) {
    await insertCms(clonePool, 'affiliated-colleges', {
      title: row.Title || `College ${row.Id}`,
      linkUrl: row.URL,
      isPublished: bool(row.IsActive, true),
      publishDate: row.Upload_Date || row.CreatedDate,
    }, adminId, deptMap);
  }

  // THE UNIVERSITY → About Us / Founder / Vision / Mission / Objective / Goal / Centenary
  // Source: dbo.UniversityPages (Type + HTML Content) — same as AdminHome UniversityAboutus
  const universityPageTypeToModule = {
    AboutUs: 'about-us',
    Founder: 'founder',
    Vision: 'vision',
    Mission: 'mission',
    Objective: 'objective',
    Goal: 'goal',
    CentenaryYear: 'centenary-year',
  };
  for (const row of await selectAll(
    sourcePool,
    `SELECT Id, Type, Content, Isdeleted FROM dbo.UniversityPages WHERE ISNULL(Isdeleted,0)=0`
  )) {
    const moduleKey = universityPageTypeToModule[row.Type];
    if (!moduleKey) continue;
    await insertCms(
      clonePool,
      moduleKey,
      {
        title: row.Type,
        category: row.Type,
        description: row.Content || '',
        isPublished: true,
        priority: row.Id || 0,
      },
      adminId,
      deptMap
    );
  }

  // University documents (also in dbo.Documents) — CMS copy for dedicated list if needed
  for (const row of await selectAll(
    sourcePool,
    `SELECT * FROM dbo.UniversityDocuments WHERE ISNULL(IsDeleted,0)=0`
  )) {
    await insertCms(
      clonePool,
      'university-document',
      {
        title: row.Title,
        filePath: row.URL,
        fileName: row.URL ? String(row.URL).split(/[/\\]/).pop() : null,
        fileType: row.FileType,
        isPublished: bool(row.IsActive, true),
        publishDate: row.CreatedDate,
      },
      adminId,
      deptMap
    );
  }

  // Policy
  try {
    for (const row of await selectAll(
      sourcePool,
      `SELECT * FROM dbo.UniversityPolicy WHERE ISNULL(IsDeleted,0)=0`
    )) {
      await insertCms(
        clonePool,
        'policy',
        {
          title: row.Name || `Policy ${row.Id}`,
          category: row.Type,
          description: row.Content,
          filePath: row.URL,
          fileName: row.URL ? String(row.URL).split(/[/\\]/).pop() : null,
          priority: row.priority || 0,
          isPublished: bool(row.IsActive, true),
        },
        adminId,
        deptMap
      );
    }
  } catch (err) {
    console.log(`  UniversityPolicy skipped: ${err.message}`);
  }

  // Recognition
  try {
    for (const row of await selectAll(
      sourcePool,
      `SELECT * FROM dbo.UniversityRecognition WHERE ISNULL(IsDeleted,0)=0`
    )) {
      await insertCms(
        clonePool,
        'recognition',
        {
          title: row.Title || `Recognition ${row.Id}`,
          filePath: row.URL,
          fileName: row.URL ? String(row.URL).split(/[/\\]/).pop() : null,
          fileType: row.FileType,
          isPublished: bool(row.IsActive, true),
          publishDate: row.CreatedDate,
        },
        adminId,
        deptMap
      );
    }
  } catch (err) {
    console.log(`  UniversityRecognition skipped: ${err.message}`);
  }

  // Minutes of meeting
  try {
    for (const row of await selectAll(
      sourcePool,
      `SELECT * FROM dbo.MinutesofMeetings WHERE ISNULL(IsDeleted,0)=0`
    )) {
      await insertCms(
        clonePool,
        'minutes-meeting',
        {
          title: row.Title || row.Name || `Minutes ${row.Id}`,
          description: row.Description || row.Content,
          filePath: row.URL || row.FilePath,
          fileName: (row.URL || row.FilePath)
            ? String(row.URL || row.FilePath).split(/[/\\]/).pop()
            : null,
          category: row.Type || row.Category,
          publishDate: row.MeetingDate || row.CreatedDate,
          isPublished: bool(row.IsActive, true),
          priority: row.Priority || 0,
        },
        adminId,
        deptMap
      );
    }
  } catch (err) {
    console.log(`  MinutesofMeetings skipped: ${err.message}`);
  }

  // Teaching / Non-teaching details
  try {
    for (const row of await selectAll(sourcePool, `SELECT * FROM dbo.TeachingNonTeachingDetails`)) {
      await insertCms(
        clonePool,
        'teaching-details',
        {
          title: row.Title || row.Name || row.Designation || `Staff ${row.Id}`,
          caption: row.Designation || row.Type,
          description: row.Description || row.Details || row.Content,
          category: row.Type || row.Category,
          imagePath: row.Image || row.Photo || row.URL,
          isPublished: bool(row.IsActive, true),
          priority: row.Priority || 0,
        },
        adminId,
        deptMap
      );
    }
  } catch (err) {
    console.log(`  TeachingNonTeachingDetails skipped: ${err.message}`);
  }

  console.log('  CMS modules imported (university pages, policy, recognition, minutes, …)');
}

async function main() {
  await assertSafety();

  console.log('========================================');
  console.log(' READ-ONLY import');
  console.log(` Source (SELECT only): ${SOURCE_DB}`);
  console.log(` Target (WRITE only):  ${CLONE_DB}`);
  console.log('========================================');

  const sourcePool = await new sql.ConnectionPool({
    ...baseConfig(SOURCE_DB),
    options: {
      ...baseConfig(SOURCE_DB).options,
      readOnlyIntent: true,
    },
  }).connect();

  const clonePool = await new sql.ConnectionPool(baseConfig(CLONE_DB)).connect();

  try {
    // Verify we are on the expected DBs
    const srcDb = await sourcePool.request().query('SELECT DB_NAME() AS db');
    const dstDb = await clonePool.request().query('SELECT DB_NAME() AS db');
    console.log(`Connected source=${srcDb.recordset[0].db}, clone=${dstDb.recordset[0].db}`);

    if (srcDb.recordset[0].db.toLowerCase() !== SOURCE_DB.toLowerCase()) {
      throw new Error('Source connection is not on SOURCE_DB_NAME');
    }
    if (dstDb.recordset[0].db.toLowerCase() !== CLONE_DB.toLowerCase()) {
      throw new Error('Clone connection is not on DB_NAME');
    }

    const adminId = await ensureAdmin(clonePool);
    console.log(`Using admin Id=${adminId}`);

    console.log('\n[0] Clearing clone content tables (clone only)...');
    await clearCloneContent(clonePool);

    console.log('\n[1/9] Departments...');
    const deptMap = await importDepartments(sourcePool, clonePool, adminId);

    console.log('[2/8] Banners...');
    await importBanners(sourcePool, clonePool, deptMap, adminId);

    console.log('[3/8] NewsEvents...');
    await importNewsEvents(sourcePool, clonePool, deptMap, adminId);

    console.log('[4/8] Galleries + images...');
    await importGalleries(sourcePool, clonePool, deptMap, adminId);

    console.log('[5/8] Documents...');
    await importDocuments(sourcePool, clonePool, deptMap, adminId);

    console.log('[6/8] Notices...');
    await importNotices(sourcePool, clonePool, deptMap, adminId);

    console.log('[7/8] Faculty...');
    await importFaculty(sourcePool, clonePool, deptMap, adminId);

    console.log('[8/9] Pages...');
    await importPages(sourcePool, clonePool, adminId);

    console.log('[9/9] CMS modules...');
    await importCmsModules(sourcePool, clonePool, deptMap, adminId);

    console.log('\n========== IMPORT SUMMARY ==========');
    Object.entries(stats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    console.log('====================================');
    console.log('Done. Source DB was not modified (read-only SELECTs only).');
    console.log('Note: Image/file paths still point to original URLs/paths.');
    console.log('Open admin UI and verify lists. Login: admin / Admin@12345');
  } finally {
    await sourcePool.close();
    await clonePool.close();
  }
}

main().catch((err) => {
  console.error('\nIMPORT FAILED:', err.message);
  process.exit(1);
});

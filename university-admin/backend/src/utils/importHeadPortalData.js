/**
 * READ-ONLY: import Head-portal related CMS rows from MGKVP_WEBSITE_MAIN.
 * Does not clear unrelated CmsEntries — only replaces listed module keys.
 */
require('dotenv').config();
const sql = require('mssql');

function clean(v, f = '') {
  if (v == null || v === '') return f;
  return String(v).trim().replace(/^["']|["']$/g, '');
}
function bool(v, fallback = true) {
  if (v == null) return fallback;
  if (typeof v === 'number') return v !== 0;
  return Boolean(v);
}
function trunc(v, max = 500) {
  if (v == null) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}
function fileName(p) {
  return p ? String(p).split(/[/\\]/).pop() : null;
}

const SOURCE_DB = clean(process.env.SOURCE_DB_NAME, 'MGKVP_WEBSITE_MAIN');
const CLONE_DB = clean(process.env.DB_NAME, 'mgkvp_new_admin_clone');

const MODULES = [
  'dept-logo-email',
  'dept-add-menu',
  'dept-page-content',
  'testimonial',
  'dept-head',
  'alumni-list',
  'alumni-news-event',
  'alumni-association',
  'professors-pages',
  'ex-professors',
  'journals',
  'dept-syllabus',
  'dept-e-content',
  'student-request',
  'extra-curricular',
  'social-media-link',
  'faculty-album',
  'faculty-gallery',
  'dean-assistant',
  'ex-dean',
  'faculty-noticeboard',
  'feedback-student',
];

function cfg(database) {
  return {
    server: clean(process.env.DB_SERVER),
    port: +clean(process.env.DB_PORT, '1433'),
    database,
    user: clean(process.env.DB_USER),
    password: clean(process.env.DB_PASSWORD),
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
    requestTimeout: 180000,
  };
}

async function insertCms(pool, moduleKey, data, adminId) {
  await pool
    .request()
    .input('moduleKey', sql.NVarChar, moduleKey)
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
        (ModuleKey, Title, Caption, Description, Category, LinkUrl,
         ImagePath, ImageName, FilePath, FileName, FileType, Priority, IsPublished, PublishDate,
         CreatedBy, UpdatedBy)
      VALUES
        (@moduleKey, @title, @caption, @description, @category, @linkUrl,
         @imagePath, @imageName, @filePath, @fileName, @fileType, @priority, @isPublished, @publishDate,
         @userId, @userId)
    `);
}

async function main() {
  if (SOURCE_DB.toLowerCase() === CLONE_DB.toLowerCase()) throw new Error('SOURCE/CLONE must differ');
  const source = await new sql.ConnectionPool({
    ...cfg(SOURCE_DB),
    options: { ...cfg(SOURCE_DB).options, readOnlyIntent: true },
  }).connect();
  const clone = await new sql.ConnectionPool(cfg(CLONE_DB)).connect();

  try {
    const adminId = (await clone.request().query(`SELECT TOP 1 Id FROM dbo.Administrators ORDER BY Id`))
      .recordset[0]?.Id;
    if (!adminId) throw new Error('No admin');

    for (const key of MODULES) {
      await clone.request().input('k', sql.NVarChar, key).query(`DELETE FROM dbo.CmsEntries WHERE ModuleKey=@k`);
    }
    console.log('Cleared head-related CmsEntries');

    const sel = async (q) => (await source.request().query(q)).recordset;
    const run = async (label, moduleKey, query, map) => {
      try {
        const rows = await sel(query);
        for (const row of rows) {
          const data = map(row);
          if (!data) continue;
          await insertCms(clone, moduleKey, data, adminId);
        }
        console.log(`  ${label} → ${moduleKey}: ${rows.length}`);
      } catch (err) {
        console.log(`  ${label} skipped: ${err.message}`);
      }
    };

    await run('Dept_logo', 'dept-logo-email', `SELECT * FROM dbo.Dept_logo`, (r) => ({
      title: r.Title || r.Email || `Dept logo ${r.Id || 1}`,
      caption: r.DeptId != null ? `dept:${r.DeptId}` : null,
      imagePath: r.LogoURL || r.Logo || r.URL || r.ImgName || r.Image,
      imageName: fileName(r.LogoURL || r.Logo || r.URL || r.ImgName),
      isPublished: bool(r.IsActive, true),
    }));

    await run(
      'Dept_Menu_other / Menus dept',
      'dept-add-menu',
      `SELECT * FROM dbo.Dept_Menu_other`,
      (r) => ({
        title: r.Title || r.MenuName || `Menu ${r.Id}`,
        caption: r.Icon,
        linkUrl: r.URL || r.NavigateURL,
        category: r.ParentID != null ? `parent:${r.ParentID}` : 'root',
        priority: r.DisplaySerial || r.Priority || 0,
        isPublished: bool(r.IsActive, true),
      })
    );

    await run(
      'Dept_Pages_Content sample',
      'dept-page-content',
      `SELECT TOP 200 Id, Title, Content, Type, DeptId, IsActive, CreatedDate, DisplaySrNo
       FROM dbo.Dept_Pages_Content
       WHERE Title IS NOT NULL
       ORDER BY Id DESC`,
      (r) => ({
        title: r.Title,
        category: r.Type,
        description: r.Content,
        caption: r.DeptId != null ? `dept:${r.DeptId}` : null,
        priority: r.DisplaySrNo || 0,
        isPublished: bool(r.IsActive, true),
        publishDate: r.CreatedDate,
      })
    );

    await run('Testimonials', 'testimonial', `SELECT * FROM dbo.Testimonials`, (r) => ({
      title: r.Name || r.Title || `Testimonial ${r.Id}`,
      caption: r.Designation || r.Post,
      description: r.Message || r.Description || r.Content,
      imagePath: r.URL || r.Image || r.Photo,
      imageName: fileName(r.URL || r.Image),
      priority: r.Priority || 0,
      isPublished: bool(r.IsActive, true),
    }));

    await run('Dept_Head', 'dept-head', `SELECT * FROM dbo.Dept_Head`, (r) => ({
      title: r.Name || `Head ${r.Id}`,
      caption: r.Designation,
      category: [r.From, r.To].filter(Boolean).join(' – '),
      description: r.OtherDetails || r.Email_Id,
      linkUrl: r.Email_Id || r.URL,
      imagePath: r.URL || r.Photo,
      imageName: fileName(r.URL),
      priority: r.Priority || 0,
      isPublished: bool(r.IsActive, true),
    }));

    await run('Alumni', 'alumni-list', `SELECT * FROM dbo.Alumni`, (r) => ({
      title: r.Name || r.Title || `Alumni ${r.Id}`,
      caption: r.Batch || r.Year,
      category: r.Course || r.Department,
      description: r.Details || r.Description,
      linkUrl: r.Email || r.URL,
      imagePath: r.Photo || r.URL,
      isPublished: bool(r.IsActive, true),
    }));

    await run(
      'Alumni_NewsEvents',
      'alumni-news-event',
      `SELECT * FROM dbo.Alumni_NewsEvents`,
      (r) => ({
        title: r.Title || r.Name || `Alumni news ${r.Id}`,
        caption: r.OrganizedBy,
        description: r.Summary || r.Description,
        filePath: r.URL,
        fileName: fileName(r.URL),
        imagePath: r.Image,
        publishDate: r.EventDate || r.CreatedDate,
        isPublished: bool(r.IsActive, true),
      })
    );

    await run(
      'Alumni_Association',
      'alumni-association',
      `SELECT * FROM dbo.Alumni_Association WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Name || `Alumni assoc ${r.Id}`,
        caption: r.Designation,
        description: [r.EmailId, r.ContactNo, r.From, r.To].filter(Boolean).join(' | '),
        imagePath: r.URL,
        imageName: fileName(r.URL),
        priority: r.Priority || 0,
        isPublished: bool(r.IsActive, true),
      })
    );

    await run(
      'ProfPageNames',
      'professors-pages',
      `SELECT TOP 300 * FROM dbo.ProfPageNames`,
      (r) => ({
        title: r.PageName || r.Title || `Page ${r.Id}`,
        caption: r.ProfId != null ? `prof:${r.ProfId}` : r.Name,
        description: r.Content || r.Description,
        category: r.Type,
        isPublished: true,
      })
    );

    await run(
      'Journals',
      'journals',
      `SELECT * FROM dbo.Journals WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title || `Journal ${r.Id}`,
        filePath: r.URL,
        fileName: fileName(r.URL),
        publishDate: r.Upload_Date || r.CreatedDate,
        isPublished: bool(r.IsActive, true),
      })
    );

    await run(
      'ExProfessorDetails',
      'ex-professors',
      `SELECT * FROM dbo.ExProfessorDetails`,
      (r) => ({
        title: r.Name || `Ex-Professor ${r.Id}`,
        caption: r.Designation,
        description: [r.Qualification, r.OtherDetails].filter(Boolean).join('\n'),
        linkUrl: r.Email_Id,
        imagePath: r.URL,
        imageName: fileName(r.URL),
        isPublished: bool(r.IsActive, true),
      })
    );

    await run(
      'Syllabus dept sample',
      'dept-syllabus',
      `SELECT TOP 200 * FROM dbo.Syllabus WHERE ISNULL(IsDeleted,0)=0 ORDER BY Id DESC`,
      (r) => ({
        title: r.Syllabus_Name,
        caption: r.Exam_Type,
        category: r.Syllabus_Type,
        filePath: r.Syllabus_url,
        fileName: fileName(r.Syllabus_url),
        publishDate: r.upload_date,
        isPublished: bool(r.IsActive, true),
      })
    );

    await run(
      'E_Content',
      'dept-e-content',
      `SELECT TOP 300 * FROM dbo.E_Content WHERE ISNULL(IsDeleted,0)=0 ORDER BY Id DESC`,
      (r) => ({
        title: r.Title || r.Subject_Name || `E-Content ${r.Id}`,
        caption: r.Lecturer_Name || r.UploadedBy,
        category: r.Type,
        filePath: r.URL,
        fileName: fileName(r.URL),
        publishDate: r.CreatedDate || r.Uploade_date,
        isPublished: true,
      })
    );

    await run(
      'Student_Request',
      'student-request',
      `SELECT TOP 200 * FROM dbo.Student_Request ORDER BY Id DESC`,
      (r) => ({
        title: r.StudentName || r.Subject || r.Title || `Request ${r.Id}`,
        caption: r.RequestType || r.Type,
        description: r.Message || r.Details || r.Description,
        linkUrl: r.Email || r.Mobile,
        category: r.Status,
        isPublished: true,
      })
    );

    await run(
      'tbl_StudentCentricActivity',
      'extra-curricular',
      `SELECT * FROM dbo.tbl_StudentCentricActivity WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Courses || r.Title || r.ActivityName || `Activity ${r.Pk_Id || r.Id}`,
        caption: r.Course_type || r.presenter,
        category: r.Type,
        description: [r.supervisionby, r.presenter].filter(Boolean).join(' | '),
        linkUrl: r.URL,
        filePath: r.URL,
        fileName: fileName(r.URL),
        publishDate: r.Upload_Date || r.Created_date,
        isPublished: bool(r.isActive ?? r.IsActive, true),
      })
    );

    // No SocialMeadia table in source — form still available for Add New
    console.log('  SocialMeadia: table not in source (form still available for Add New)');

    await run(
      'tbl_TeacherFeedback sample',
      'feedback-student',
      `SELECT TOP 100 * FROM dbo.tbl_TeacherFeedback ORDER BY ID DESC`,
      (r) => ({
        title: r.TeacherName || `Feedback ${r.ID}`,
        caption: r.DepartmentName,
        category: r.DeptID != null ? `dept:${r.DeptID}` : null,
        description: [
          r.Suggestion,
          ['Q1', r.Q_1],
          ['Q2', r.Q_2],
          ['Q3', r.Q_3],
          ['Q4', r.Q_4],
          ['Q5', r.Q_5],
        ]
          .filter((x) => (Array.isArray(x) ? x[1] : x))
          .map((x) => (Array.isArray(x) ? `${x[0]}:${x[1]}` : x))
          .join(' | '),
        publishDate: r.CreatedDate,
        isPublished: true,
      })
    );

    await run('FacuAlbums', 'faculty-album', `SELECT * FROM dbo.FacuAlbums`, (r) => ({
      title: r.Name || r.Title || `Album ${r.Id}`,
      caption: r.Type,
      imagePath: r.ImgName || r.URL,
      imageName: fileName(r.ImgName || r.URL),
      isPublished: bool(r.IsActive, true),
    }));

    await run('FacuGalleries', 'faculty-gallery', `SELECT * FROM dbo.FacuGalleries`, (r) => ({
      title: r.Title || `Gallery ${r.Id}`,
      caption: r.AlbumId != null ? `album:${r.AlbumId}` : r.Type,
      imagePath: r.URL,
      imageName: fileName(r.URL),
      isPublished: bool(r.IsActive, true),
    }));

    await run('Dean_Assistant', 'dean-assistant', `SELECT * FROM dbo.Dean_Assistant`, (r) => ({
      title: r.Name || `Assistant ${r.Id}`,
      caption: r.Designation,
      description: [r.Email_Id, r.Mobile].filter(Boolean).join(' | '),
      imagePath: r.URL,
      priority: r.Priority || 0,
      isPublished: bool(r.IsActive, true),
    }));

    await run(
      'Dean_Mst ex',
      'ex-dean',
      `SELECT * FROM dbo.Dean_Mst`,
      (r) => ({
        title: r.Name || `Dean ${r.Id}`,
        caption: r.Designation || r.Type,
        description: [r.From, r.To, r.Email_Id].filter(Boolean).join(' | '),
        imagePath: r.URL,
        isPublished: bool(r.IsActive, true),
      })
    );

    console.log('Done. Source not modified.');
  } finally {
    await source.close();
    await clone.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

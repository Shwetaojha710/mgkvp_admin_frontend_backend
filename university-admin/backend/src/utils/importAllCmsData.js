/**
 * Full CMS + notices fill from MGKVP_WEBSITE_MAIN → clone (READ-ONLY source).
 * - Clears dbo.CmsEntries and re-imports all mapped modules
 * - Replaces dbo.Notices with Dept_Notecboard + Acadmic_Holidaylist(NoticeBoard)
 * Does NOT touch Banners / NewsEvents / Galleries / Documents / Faculty / Pages / Departments.
 *
 * Usage: node src/utils/importAllCmsData.js
 */
require('dotenv').config();
const sql = require('mssql');

function clean(v, fallback = '') {
  if (v === undefined || v === null || v === '') return fallback;
  return String(v).trim().replace(/^["']|["']$/g, '');
}
function bool(v, fallback = false) {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'number') return v !== 0;
  return Boolean(v);
}
function trunc(v, max = 500) {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}
function fileName(path) {
  if (!path) return null;
  return String(path).split(/[/\\]/).pop() || null;
}

const SOURCE_DB = clean(process.env.SOURCE_DB_NAME, 'MGKVP_WEBSITE_MAIN');
const CLONE_DB = clean(process.env.DB_NAME, 'mgkvp_new_admin_clone');
const stats = {};
function bump(k, n = 1) {
  stats[k] = (stats[k] || 0) + n;
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
    requestTimeout: 300000,
  };
}

async function selectAll(pool, text) {
  const normalized = text.trim().replace(/^\/\*[\s\S]*?\*\//, '').trim();
  if (!/^SELECT\b/i.test(normalized)) throw new Error('Source may only SELECT');
  return (await pool.request().query(text)).recordset;
}

async function insertCms(clonePool, moduleKey, data, adminId, deptMap) {
  await clonePool
    .request()
    .input('moduleKey', sql.NVarChar, moduleKey)
    .input('departmentId', sql.Int, data.departmentId ? (deptMap && deptMap.get(data.departmentId)) || null : null)
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

async function insertMany(clonePool, moduleKey, rows, adminId, deptMap, mapRow) {
  const BATCH = 30;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await Promise.all(
      chunk.map((row) => {
        const data = mapRow(row);
        if (!data) return Promise.resolve();
        return insertCms(clonePool, moduleKey, data, adminId, deptMap);
      })
    );
    if ((i + BATCH) % 300 === 0 || i + BATCH >= rows.length) {
      process.stdout.write(`  ${moduleKey}: ${Math.min(i + BATCH, rows.length)}/${rows.length}\r`);
    }
  }
  if (rows.length) console.log(`  ${moduleKey}: ${rows.length} done`);
}

/** Acadmic_Holidaylist.Type → CMS moduleKey */
const HOLIDAY_TYPE_MAP = {
  TimeTable: 'time-table',
  Admission: 'admission-notification',
  NoticeBoard: 'noticeboard-announcement',
  Examination: 'exam-notification',
  Research: 'research-notification',
  Circulars: 'affiliation-circulars',
  Recruitment: 'recruitments',
  Holidays: 'holiday-list',
  Centric_Activities: 'extra-curricular',
  Tenders: 'tenders',
  Scholarship: 'scholarship-notification',
  Student_Election: 'sue-notification',
  NEP: 'nep-notification',
  Various_Proforma: 'university-forms',
  NCTE_Recognition_Letters: 'ncte-letters',
  Academic_Calendar: 'academic-calendar',
  RTI: 'rti-notification',
  Proctorial: 'proctorial-notification',
  MOM: 'minutes-meeting',
  'Activity Club': 'extra-curricular',
};

async function main() {
  if (SOURCE_DB.toLowerCase() === CLONE_DB.toLowerCase()) throw new Error('SOURCE and CLONE must differ');
  if (!/clone/i.test(CLONE_DB)) throw new Error(`Refusing write target ${CLONE_DB}`);

  console.log(`[READ-ONLY] ${SOURCE_DB} → [WRITE] ${CLONE_DB}`);
  const sourcePool = await new sql.ConnectionPool({
    ...baseConfig(SOURCE_DB),
    options: { ...baseConfig(SOURCE_DB).options, readOnlyIntent: true },
  }).connect();
  const clonePool = await new sql.ConnectionPool(baseConfig(CLONE_DB)).connect();

  try {
    const adminId = (await clonePool.request().query(`SELECT TOP 1 Id FROM dbo.Administrators ORDER BY Id`))
      .recordset[0]?.Id;
    if (!adminId) throw new Error('No admin — run npm run seed');

    const deptRows = await clonePool.request().query(`SELECT Id, Code FROM dbo.Departments`);
    // Source DeptId often matches loosely; map by identity order if needed — use empty map for numeric source ids that may not match
    const deptMap = new Map();
    // Also load source→clone dept map by name if possible
    try {
      const srcDepts = await selectAll(sourcePool, `SELECT Id, Name FROM dbo.Departments`);
      const cloneDepts = await clonePool.request().query(`SELECT Id, Name FROM dbo.Departments`);
      const byName = new Map(cloneDepts.recordset.map((d) => [String(d.Name).trim().toLowerCase(), d.Id]));
      for (const s of srcDepts) {
        const cid = byName.get(String(s.Name || '').trim().toLowerCase());
        if (cid) deptMap.set(s.Id, cid);
      }
      console.log(`Dept map entries: ${deptMap.size}`);
    } catch (err) {
      console.log(`Dept map skipped: ${err.message}`);
    }
    void deptRows;

    console.log('\n[1] Clearing CmsEntries…');
    await clonePool.request().query(`DELETE FROM dbo.CmsEntries`);

    console.log('\n[2] Acadmic_Holidaylist → many modules…');
    const holidays = await selectAll(
      sourcePool,
      `SELECT Id, Type, Notice_Board, Date, URL, IsActive, DeptId, FileType, IsDeleted
       FROM dbo.Acadmic_Holidaylist
       WHERE ISNULL(IsDeleted,0)=0 AND Notice_Board IS NOT NULL`
    );
    const byModule = new Map();
    for (const row of holidays) {
      const moduleKey = HOLIDAY_TYPE_MAP[row.Type];
      if (!moduleKey) continue;
      if (!byModule.has(moduleKey)) byModule.set(moduleKey, []);
      byModule.get(moduleKey).push(row);
    }
    for (const [moduleKey, rows] of byModule) {
      await insertMany(clonePool, moduleKey, rows, adminId, deptMap, (row) => ({
        title: row.Notice_Board,
        category: row.Type,
        filePath: row.URL,
        fileName: fileName(row.URL),
        fileType: row.FileType,
        departmentId: row.DeptId || null,
        publishDate: row.Date,
        isPublished: bool(row.IsActive, true),
        priority: row.Id || 0,
      }));
    }

    console.log('\n[3] University pages…');
    const pageMap = {
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
      `SELECT Id, Type, Content FROM dbo.UniversityPages WHERE ISNULL(Isdeleted,0)=0`
    )) {
      const mk = pageMap[row.Type];
      if (!mk) continue;
      await insertCms(
        clonePool,
        mk,
        { title: row.Type, category: row.Type, description: row.Content || '', isPublished: true, priority: row.Id },
        adminId,
        deptMap
      );
    }

    const simple = async (label, moduleKey, query, mapRow) => {
      try {
        const rows = await selectAll(sourcePool, query);
        console.log(`\n[${label}] ${rows.length} rows → ${moduleKey}`);
        await insertMany(clonePool, moduleKey, rows, adminId, deptMap, mapRow);
      } catch (err) {
        console.log(`  ${label} skipped: ${err.message}`);
      }
    };

    await simple('Albums CMS', 'album', `SELECT * FROM dbo.Albums`, (r) => ({
      title: r.Name,
      caption: r.Type,
      imagePath: r.ImgName,
      imageName: fileName(r.ImgName),
      departmentId: r.DeptId,
      isPublished: bool(r.IsActive, true),
    }));

    await simple(
      'AcademicEventAlbum',
      'academic-event-album',
      `SELECT * FROM dbo.AcademicEventAlbum WHERE ISNULL(Isdeleted,0)=0`,
      (r) => ({
        title: r.Name,
        caption: r.Type,
        imagePath: r.ImgName,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'AcademicEventGallery',
      'event-gallery',
      `SELECT * FROM dbo.AcademicEventGallery WHERE ISNULL(isdeleted,0)=0`,
      (r) => ({
        title: r.Title,
        category: r.Type,
        imagePath: r.URL,
        imageName: fileName(r.URL),
        isPublished: bool(r.IsActive, true),
        caption: r.AlbumId != null ? `album:${r.AlbumId}` : null,
      })
    );

    await simple('Noble_Alumni', 'noble-alumni', `SELECT * FROM dbo.Noble_Alumni`, (r) => ({
      title: r.Name,
      caption: r.Designation,
      description: r.OtherDetails,
      linkUrl: r.URL,
      imagePath: r.URL,
      priority: r.Priority || 0,
      isPublished: true,
    }));

    await simple('Marquees', 'marquee', `SELECT * FROM dbo.Marquees`, (r) => ({
      title: r.Title,
      linkUrl: r.NavigateURL,
      priority: r.Priority || 0,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('PopUpMarquee', 'popup', `SELECT * FROM dbo.PopUpMarquee WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Title,
      description: r.Description,
      imagePath: r.Image,
      linkUrl: r.URL,
      caption: r.ButtonName,
      priority: r.Priority || 0,
      isPublished: bool(r.IsDisplay, true),
    }));

    await simple('HomePageButtions', 'button', `SELECT * FROM dbo.HomePageButtions`, (r) => ({
      title: r.Heading,
      caption: r.SubHeading,
      linkUrl: r.Url,
      imagePath: r.ImageIcon,
      priority: r.Priority || 0,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('HomePageHighlights', 'highlights', `SELECT * FROM dbo.HomePageHighlights`, (r) => ({
      title: r.Heading1 || `Highlight ${r.Id}`,
      description: [r.Heading1, r.Heading2, r.Heading3, r.Heading4].filter(Boolean).join(' | '),
      linkUrl: r.Heading1Url,
      priority: r.Priority || 0,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('Enewspapers', 'e-newspaper', `SELECT * FROM dbo.Enewspapers WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Title,
      filePath: r.URL,
      fileName: fileName(r.URL),
      fileType: r.Type,
      departmentId: r.DeptId,
      publishDate: r.CreatedDate,
      isPublished: true,
    }));

    await simple('UsefulLinks', 'useful-links', `SELECT * FROM dbo.UsefulLinks WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Title,
      imagePath: r.Image,
      linkUrl: r.URL,
      priority: r.Priority || 0,
      isPublished: true,
    }));

    await simple('Contects', 'contacts', `SELECT * FROM dbo.Contects WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Name || `Contact ${r.Id}`,
      caption: r.Designation,
      description: [r.Email, r.Mobile_No].filter(Boolean).join(' | '),
      linkUrl: r.Email,
      priority: r.Priority || 0,
      isPublished: bool(r.IsActive, true),
    }));

    await simple(
      'StudentZoneFront',
      'home-student-zone',
      `SELECT * FROM dbo.StudentZoneFront WHERE ISNULL(Isdeleted,0)=0`,
      (r) => ({
        title: r.Title || r.Heading || r.ZoneName || `Item ${r.Id}`,
        caption: r.Button || r.ZoneName,
        linkUrl: r.URL,
        imagePath: r.Icon,
        priority: r.Priority || 0,
        category: r.Type,
        isPublished: true,
      })
    );

    await simple('Menus', 'menu-list', `SELECT * FROM dbo.Menus WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Title,
      linkUrl: r.URL,
      caption: r.Icon,
      priority: r.DisplaySerial || 0,
      category: r.ParentID ? `parent:${r.ParentID}` : 'root',
      isPublished: bool(r.IsActive, true),
    }));

    await simple(
      'AffiliatedColleges',
      'affiliated-colleges',
      `SELECT * FROM dbo.AffiliatedColleges WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title || `College ${r.Id}`,
        linkUrl: r.URL,
        isPublished: bool(r.IsActive, true),
        publishDate: r.Upload_Date || r.CreatedDate,
      })
    );

    await simple(
      'UniversityDocuments',
      'university-document',
      `SELECT * FROM dbo.UniversityDocuments WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title,
        filePath: r.URL,
        fileName: fileName(r.URL),
        fileType: r.FileType,
        isPublished: bool(r.IsActive, true),
        publishDate: r.CreatedDate,
      })
    );

    await simple(
      'UniversityPolicy',
      'policy',
      `SELECT * FROM dbo.UniversityPolicy WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Name,
        category: r.Type,
        description: r.Content,
        filePath: r.URL,
        fileName: fileName(r.URL),
        priority: r.priority || 0,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'UniversityRecognition',
      'recognition',
      `SELECT * FROM dbo.UniversityRecognition WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title,
        filePath: r.URL,
        fileName: fileName(r.URL),
        fileType: r.FileType,
        isPublished: bool(r.IsActive, true),
        publishDate: r.CreatedDate,
      })
    );

    await simple(
      'MinutesofMeetings',
      'minutes-meeting',
      `SELECT * FROM dbo.MinutesofMeetings WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title || r.Name || `Minutes ${r.Id}`,
        description: r.Description || r.Content,
        filePath: r.URL || r.FilePath,
        fileName: fileName(r.URL || r.FilePath),
        category: r.Type || r.Category,
        isPublished: bool(r.IsActive, true),
        priority: r.Priority || 0,
      })
    );

    await simple('TeachingNonTeachingDetails', 'teaching-details', `SELECT * FROM dbo.TeachingNonTeachingDetails`, (r) => ({
      title: r.Title || r.Name || r.Designation || `Staff ${r.Id}`,
      caption: r.Designation || r.Type,
      description: r.Description || r.Details || r.Content,
      category: r.Type || r.Category,
      imagePath: r.Image || r.Photo || r.URL,
      isPublished: bool(r.IsActive, true),
      priority: r.Priority || 0,
    }));

    await simple('Course_Master', 'courses', `SELECT * FROM dbo.Course_Master WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Course_Name,
      category: r.Course_Type,
      caption: r.Exam_Type,
      description: `Duration: ${r.Duration_Minimum || '-'} – ${r.Duration_Maximum || '-'}`,
      filePath: r.Syllabus_url,
      fileName: fileName(r.Syllabus_url),
      departmentId: r.DeptId,
      publishDate: r.upload_date,
      isPublished: bool(r.IsActive, true),
    }));

    await simple(
      'AcademicFeeCourses Fee',
      'fee-structure',
      `SELECT * FROM dbo.AcademicFeeCourses WHERE ISNULL(IsDeleted,0)=0 AND Type=N'Fee_Structure'`,
      (r) => ({
        title: r.Title,
        category: r.Type,
        filePath: r.URL,
        fileName: fileName(r.URL),
        fileType: r.FileType,
        publishDate: r.Uploaded_Date,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple('Syllabus', 'syllabus', `SELECT * FROM dbo.Syllabus WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Syllabus_Name,
      category: r.Syllabus_Type,
      caption: r.Exam_Type,
      filePath: r.Syllabus_url,
      fileName: fileName(r.Syllabus_url),
      departmentId: r.DeptId,
      publishDate: r.upload_date,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('Syllabus_new', 'syllabus-new', `SELECT * FROM dbo.Syllabus_new WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Syllabus_Name,
      category: r.Syllabus_Type,
      caption: r.Exam_Type,
      filePath: r.Syllabus_url,
      fileName: fileName(r.Syllabus_url),
      departmentId: r.DeptId,
      publishDate: r.upload_date,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('Convocations', 'convocation', `SELECT * FROM dbo.Convocations`, (r) => ({
      title: r.Notifications || `Convocation ${r.Year}`,
      category: String(r.Year || ''),
      filePath: r.URL,
      fileName: fileName(r.URL),
      publishDate: r.Upload_Date,
      isPublished: true,
    }));

    await simple('BooksPublisheds', 'published-books', `SELECT * FROM dbo.BooksPublisheds`, (r) => ({
      title: r.BookName,
      caption: r.PublishedBy,
      description: r.ISBNNo,
      filePath: r.URL,
      fileName: fileName(r.URL),
      fileType: r.FileType,
      departmentId: r.DeptId,
      publishDate: r.UploadedDate,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('Seminars', 'seminar-workshop', `SELECT * FROM dbo.Seminars`, (r) => ({
      title: r.Seminar_name,
      caption: r.Organized_By,
      category: r.Type,
      filePath: r.Url,
      fileName: fileName(r.Url),
      fileType: r.FileType,
      publishDate: r.Event_Date_From || r.Upload_date,
      isPublished: true,
    }));

    await simple('Journals', 'journals', `SELECT * FROM dbo.Journals WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Title,
      filePath: r.URL,
      fileName: fileName(r.URL),
      departmentId: r.DeptId,
      publishDate: r.Upload_Date,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('TblJournals', 'journals', `SELECT * FROM dbo.TblJournals WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Title,
      category: r.Type,
      filePath: r.Url,
      fileName: fileName(r.Url),
      publishDate: r.PublishDate,
      isPublished: true,
    }));

    await simple('ResearchTypes', 'research-category', `SELECT * FROM dbo.ResearchTypes WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Research_Category,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('Researches', 'research', `SELECT * FROM dbo.Researches WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Title,
      category: r.Category || (r.Cat_id != null ? `cat:${r.Cat_id}` : null),
      linkUrl: r.Type === 'U' ? r.URL : null,
      filePath: r.Type !== 'U' ? r.URL : null,
      fileName: r.Type !== 'U' ? fileName(r.URL) : null,
      fileType: r.Type,
      isPublished: true,
    }));

    await simple(
      'PHDAwardDocuments',
      'phd-awarded',
      `SELECT * FROM dbo.PHDAwardDocuments WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title,
        filePath: r.URL,
        fileName: fileName(r.URL),
        fileType: r.FileType,
        publishDate: r.CreatedDate,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple('MajorEvents', 'major-event', `SELECT * FROM dbo.MajorEvents`, (r) => ({
      title: r.Seminar_name,
      caption: r.Organized_By,
      category: r.Type,
      filePath: r.Url,
      fileName: fileName(r.Url),
      fileType: r.FileType,
      publishDate: r.Event_Date_From || r.Upload_date,
      isPublished: true,
    }));

    await simple('Eresources', 'e-resources', `SELECT * FROM dbo.Eresources WHERE ISNULL(isdeleted,0)=0`, (r) => ({
      title: r.Title,
      linkUrl: r.NavigateURL,
      priority: r.Priority || 0,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('AdmissionssTypes', 'admission-category', `SELECT * FROM dbo.AdmissionssTypes WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Admission_Type,
      isPublished: bool(r.IsActive, true),
    }));

    await simple(
      'AdmissionssAllDetails',
      'admission-details',
      `SELECT * FROM dbo.AdmissionssAllDetails WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.AdminTitle,
        linkUrl: r.FileType === 'U' || (r.NavigateURL && String(r.NavigateURL).startsWith('http')) ? r.NavigateURL : null,
        filePath: r.FileType !== 'U' ? r.NavigateURL : null,
        fileName: r.FileType !== 'U' ? fileName(r.NavigateURL) : null,
        fileType: r.FileType,
        category: r.AdmiTypeId != null ? `type:${r.AdmiTypeId}` : null,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'ExaminationTypes',
      'exam-category',
      `SELECT * FROM dbo.ExaminationTypes WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Examination_Type,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'ExaminationAllDetails',
      'exam-details',
      `SELECT * FROM dbo.ExaminationAllDetails WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.ExamTitle,
        linkUrl: r.NavigateURL && String(r.NavigateURL).startsWith('http') ? r.NavigateURL : null,
        filePath: r.NavigateURL && !String(r.NavigateURL).startsWith('http') ? r.NavigateURL : null,
        fileName: fileName(r.NavigateURL),
        category: r.ExamTypeId != null ? `type:${r.ExamTypeId}` : null,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple('RTItypes', 'rti-category', `SELECT * FROM dbo.RTItypes WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.RTI_Type || r.Type || r.Title || `RTI Type ${r.Id}`,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('RTIDetails', 'rti-details', `SELECT * FROM dbo.RTIDetails WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Title || r.RTITitle || `RTI ${r.Id}`,
      filePath: r.URL || r.NavigateURL,
      fileName: fileName(r.URL || r.NavigateURL),
      linkUrl: r.NavigateURL && String(r.NavigateURL).startsWith('http') ? r.NavigateURL : null,
      category: r.RTITypeId != null ? `type:${r.RTITypeId}` : r.Type,
      isPublished: bool(r.IsActive, true),
    }));

    await simple(
      'AntiRaggingTypes',
      'anti-ragging-category',
      `SELECT * FROM dbo.AntiRaggingTypes WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.AntiRagging_Type || r.Type || r.Title || `Type ${r.Id}`,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'AntiRaggingDetails',
      'anti-ragging-details',
      `SELECT * FROM dbo.AntiRaggingDetails WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title || r.Name || `Detail ${r.Id}`,
        filePath: r.URL || r.NavigateURL,
        fileName: fileName(r.URL || r.NavigateURL),
        category: r.TypeId != null ? `type:${r.TypeId}` : r.Type,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple('Hostelslinks', 'hostels-notification', `SELECT * FROM dbo.Hostelslinks`, (r) => ({
      title: r.Title || r.Notice_Board || r.Name || `Hostel link ${r.Id}`,
      linkUrl: r.NavigateURL || r.URL,
      filePath: r.URL,
      fileName: fileName(r.URL),
      isPublished: bool(r.IsActive, true),
    }));

    await simple('Hostels', 'add-warden', `SELECT * FROM dbo.Hostels`, (r) => ({
      title: r.Name || r.WardenName || r.Title || `Hostel ${r.Id}`,
      caption: r.Designation || r.Warden,
      description: [r.Address, r.Mobile, r.Email].filter(Boolean).join(' | '),
      imagePath: r.URL || r.Photo,
      isPublished: bool(r.IsActive, true),
      priority: r.Priority || 0,
    }));

    await simple('SUEYears', 'sue-year', `SELECT * FROM dbo.SUEYears`, (r) => ({
      title: r.Year || r.Title || `SUE ${r.Id}`,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('SUEofficers', 'sue-officer', `SELECT * FROM dbo.SUEofficers`, (r) => ({
      title: r.Name || r.Title || `Officer ${r.Id}`,
      caption: r.Designation,
      description: r.Mobile || r.Contact,
      imagePath: r.URL,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('SUAssocations', 'su-association', `SELECT * FROM dbo.SUAssocations`, (r) => ({
      title: r.Name || r.Title || `Association ${r.Id}`,
      caption: r.Designation,
      description: r.Content || r.Description,
      imagePath: r.URL,
      isPublished: bool(r.IsActive, true),
    }));

    await simple(
      'ScholarshipTypes',
      'scholarship-category',
      `SELECT * FROM dbo.ScholarshipTypes WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Scholarship_Type || r.Type || r.Title || `Type ${r.Id}`,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'ScholarshipDetails',
      'scholarship-details',
      `SELECT * FROM dbo.ScholarshipDetails WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title || r.Name || `Scholarship ${r.Id}`,
        filePath: r.URL || r.NavigateURL,
        fileName: fileName(r.URL || r.NavigateURL),
        category: r.TypeId != null ? `type:${r.TypeId}` : r.Type,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple('AdminOfficers', 'admin-officer', `SELECT * FROM dbo.AdminOfficers`, (r) => ({
      title: r.Name || `Officer ${r.Id}`,
      caption: r.Designation,
      description: [r.Email_Id, r.Mobile_No, r.DepartmentName].filter(Boolean).join(' | '),
      imagePath: r.URL,
      priority: r.Priority || 0,
      isPublished: bool(r.IsActive, true),
    }));

    await simple('dhds', 'dean-head-director', `SELECT * FROM dbo.dhds`, (r) => ({
      title: r.Name || `DHD ${r.Id}`,
      caption: r.Designation || r.Type,
      description: [r.Email_Id, r.Mobile_No, r.DepartmentName].filter(Boolean).join(' | '),
      imagePath: r.URL,
      priority: r.Priority || 0,
      isPublished: bool(r.IsActive, true),
    }));

    await simple(
      'AllAuthorities Chief/Coord',
      'chief-coordinator',
      `SELECT * FROM dbo.AllAuthorities WHERE ISNULL(IsDeleted,0)=0 AND (
         AuthoritiesType LIKE N'%Chief%' OR AuthoritiesType LIKE N'%Coord%' OR AuthoritiesType LIKE N'%Cordinator%'
       )`,
      (r) => ({
        title: r.Name,
        caption: r.Designation || r.AuthoritiesType,
        description: [r.DepartmentName, r.From, r.To, r.Email_Id, r.Mobile].filter(Boolean).join(' | '),
        imagePath: r.URL,
        category: r.AuthoritiesType,
        priority: r.Priority || 0,
        isPublished: true,
      })
    );

    await simple(
      'AllAuthorities VC-ish',
      'vice-chancellor',
      `SELECT * FROM dbo.AllAuthorities WHERE ISNULL(IsDeleted,0)=0 AND (
         AuthoritiesType LIKE N'%VICE%' OR AuthoritiesType LIKE N'%President%' OR AuthoritiesType = N'VC Office'
       )`,
      (r) => ({
        title: r.Name,
        caption: r.Designation || r.AuthoritiesType,
        description: [r.DepartmentName, r.From, r.To].filter(Boolean).join(' | '),
        imagePath: r.URL,
        category: r.AuthoritiesType,
        priority: r.Priority || 0,
        isPublished: true,
      })
    );

    await simple(
      'Council_Member EC',
      'ec-members',
      `SELECT * FROM dbo.Council_Member WHERE ISNULL(IsDeleted,0)=0 AND Type=N'Executive_Council'`,
      (r) => ({
        title: r.Name,
        caption: r.Designation,
        description: [r.Address, r.Email_Id, r.Contact_No].filter(Boolean).join(' | '),
        priority: r.Priority || 0,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'Acad_Counc_Member',
      'ac-members',
      `SELECT * FROM dbo.Acad_Counc_Member WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title || `AC Member ${r.Id}`,
        category: String(r.Year || ''),
        filePath: r.URL,
        fileName: fileName(r.URL),
        publishDate: r.Uploaded_Date,
        isPublished: bool(r.IsActive, true),
      })
    );

    const agendaMap = {
      Executive_Council: 'ec-agenda',
      Academic_Council: 'ac-agenda',
      Entrance_Committee: 'entrance-agenda',
      Examination_Committee: 'exam-agenda',
    };
    try {
      const agendas = await selectAll(
        sourcePool,
        `SELECT * FROM dbo.Information_Agenda WHERE ISNULL(IsDeleted,0)=0`
      );
      for (const row of agendas) {
        const mk = agendaMap[row.Type] || 'ec-agenda';
        await insertCms(
          clonePool,
          mk,
          {
            title: row.Title,
            category: row.Type,
            filePath: row.URL,
            fileName: fileName(row.URL),
            publishDate: row.UploadedDate,
            isPublished: bool(row.IsActive, true),
          },
          adminId,
          deptMap
        );
      }
      console.log(`  Information_Agenda: ${agendas.length}`);
    } catch (err) {
      console.log(`  Information_Agenda skipped: ${err.message}`);
    }

    await simple(
      'TeacherAssociations',
      'teachers-association',
      `SELECT * FROM dbo.TeacherAssociations WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Name,
        caption: r.Office_Bearers,
        category: r.Category,
        description: r.Mobile_No,
        departmentId: r.DeptId,
        isPublished: true,
      })
    );

    await simple(
      'TeacherAssociations NonTeaching category',
      'non-teaching',
      `SELECT * FROM dbo.NonTeachings WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Name,
        caption: r.Designation,
        description: [r.Qualification, r.Email_Id, r.Phone_no].filter(Boolean).join(' | '),
        imagePath: r.URL,
        priority: r.Priority || 0,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'Noti_election_List',
      'election-notification',
      `SELECT * FROM dbo.Noti_election_List WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title,
        category: r.Type,
        filePath: r.URL,
        fileName: fileName(r.URL),
        publishDate: r.Uploaded_Date,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'ProctorialBoards',
      'proctorial-board',
      `SELECT * FROM dbo.ProctorialBoards WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Name,
        caption: r.Designation,
        description: [r.FDI, r.Mobile_No].filter(Boolean).join(' | '),
        imagePath: r.URL,
        priority: r.Priority || 0,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'University_Cell',
      'ugc-members',
      `SELECT * FROM dbo.University_Cell WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Name,
        caption: r.Designation,
        description: r.Mobile,
        category: r.Cell_Type,
        imagePath: r.URL,
        departmentId: r.DeptId,
        priority: r.Priority || 0,
        isPublished: true,
      })
    );

    await simple(
      'Cell_Notifications',
      'ugc-notification',
      `SELECT * FROM dbo.Cell_Notifications WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Notice_Board,
        category: r.Type || (r.CategoryId != null ? `cell:${r.CategoryId}` : null),
        filePath: r.URL,
        fileName: fileName(r.URL),
        fileType: r.FileType,
        publishDate: r.Date,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'AffiliationTypes',
      'affiliation-category',
      `SELECT * FROM dbo.AffiliationTypes WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Affiliation_Type,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'AffiliationDetails',
      'affiliation-list',
      `SELECT * FROM dbo.AffiliationDetails WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title,
        linkUrl: r.Type === 'U' ? r.NavigateURL : null,
        filePath: r.Type !== 'U' ? r.NavigateURL : null,
        fileName: r.Type !== 'U' ? fileName(r.NavigateURL) : null,
        category: r.AffiliationTypeId != null ? `type:${r.AffiliationTypeId}` : r.Type,
        publishDate: r.UploadDate,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'Rules Acts',
      'acts',
      `SELECT * FROM dbo.Rules_Regulations WHERE ISNULL(IsDeleted,0)=0 AND Type=N'Acts'`,
      (r) => ({
        title: r.Title,
        caption: r.Category,
        filePath: r.URL,
        fileName: fileName(r.URL),
        category: r.Type,
        isPublished: bool(r.IsActive, true),
      })
    );
    await simple(
      'Rules Ordinance',
      'ordinance',
      `SELECT * FROM dbo.Rules_Regulations WHERE ISNULL(IsDeleted,0)=0 AND Type=N'Ordinance'`,
      (r) => ({
        title: r.Title,
        caption: r.Category,
        filePath: r.URL,
        fileName: fileName(r.URL),
        category: r.Type,
        isPublished: bool(r.IsActive, true),
      })
    );
    await simple(
      'Rules Statue',
      'statue',
      `SELECT * FROM dbo.Rules_Regulations WHERE ISNULL(IsDeleted,0)=0 AND Type=N'Statue'`,
      (r) => ({
        title: r.Title,
        caption: r.Category,
        filePath: r.URL,
        fileName: fileName(r.URL),
        category: r.Type,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple('NTPCProgramme', 'ntpc-campus', `SELECT * FROM dbo.NTPCProgramme`, (r) => ({
      title: r['Programme Name'] || r.ProgrammeName || `Programme ${r['Programme Code'] || r.Id}`,
      caption: r.Level,
      category: String(r['Programme Code'] || r.ProgrammeCode || ''),
      isPublished: true,
    }));

    await simple('GCProgramms', 'gangapur-campus', `SELECT * FROM dbo.GCProgramms`, (r) => ({
      title: r['Programme Name'] || r.ProgrammeName || `Programme ${r['Programme Code'] || r.Id}`,
      caption: r.Level,
      category: String(r['Programme Code'] || r.ProgrammeCode || ''),
      isPublished: true,
    }));

    await simple('AEDP', 'aedp', `SELECT * FROM dbo.AEDP WHERE ISNULL(IsDeleted,0)=0`, (r) => ({
      title: r.Notice_Board,
      category: r.Type,
      filePath: r.URL,
      fileName: fileName(r.URL),
      fileType: r.FileType,
      publishDate: r.Date,
      isPublished: bool(r.IsActive, true),
    }));

    await simple(
      'Alumni_Association',
      'alumni-association',
      `SELECT * FROM dbo.Alumni_Association WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Name,
        caption: r.Designation,
        description: [r.EmailId, r.ContactNo, r.From, r.To].filter(Boolean).join(' | '),
        imagePath: r.URL,
        departmentId: r.DeptId,
        priority: r.Priority || 0,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple('AluAssociations', 'alumni-association', `SELECT * FROM dbo.AluAssociations`, (r) => ({
      title: 'Alumni Association Content',
      description: r.Content,
      isPublished: bool(r.IsActive, true),
    }));

    await simple(
      'AlumniNotification',
      'alumni-notifications',
      `SELECT * FROM dbo.AlumniNotification WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title,
        caption: r.OrganizedBy,
        category: r.Type,
        filePath: r.URL,
        fileName: fileName(r.URL),
        publishDate: r.UploadDate || r.EventDateFrom,
        isPublished: true,
      })
    );

    await simple('Faculties list', 'institutes', `SELECT * FROM dbo.Faculties`, (r) => ({
      title: r.Faculty_Name,
      caption: r.Dean_Name,
      description: r.OtherDetails,
      imagePath: r.Faculty_ImgURL || r.Dean_ImgURL,
      linkUrl: r.ProfileURL || r.Url_Name,
      category: r.Type,
      isPublished: true,
    }));

    await simple(
      'E_Lecture',
      'e-lectures',
      `SELECT * FROM dbo.E_Lecture WHERE ISNULL(IsDeleted,0)=0`,
      (r) => ({
        title: r.Title || r.Subject_Name || `Lecture ${r.Id}`,
        caption: r.Lecturer_Name,
        category: r.Type,
        filePath: r.URL,
        fileName: fileName(r.URL),
        departmentId: r.DeptId,
        publishDate: r.Uploade_date || r.CreatedDate,
        isPublished: true,
      })
    );

    await simple(
      'tbl_StudentCentricActivity',
      'extra-curricular',
      `SELECT * FROM dbo.tbl_StudentCentricActivity`,
      (r) => ({
        title: r.Title || r.ActivityName || r.Name || `Activity ${r.Id}`,
        description: r.Description || r.Details,
        filePath: r.URL || r.FilePath,
        fileName: fileName(r.URL || r.FilePath),
        imagePath: r.Image,
        isPublished: bool(r.IsActive, true),
      })
    );

    await simple(
      'Footer student zone MORE via holiday Various already',
      'footer-student-more',
      `SELECT * FROM dbo.StudentZoneFront WHERE ISNULL(Isdeleted,0)=0`,
      (r) => ({
        title: r.Title || r.Heading || `Student zone ${r.Id}`,
        linkUrl: r.URL,
        imagePath: r.Icon,
        priority: r.Priority || 0,
        isPublished: true,
      })
    );

    // University_Document (IND/BEP criteria)
    try {
      const udocs = await selectAll(sourcePool, `SELECT * FROM dbo.University_Document WHERE ISNULL(IsDeleted,0)=0`);
      for (const row of udocs) {
        const mk = row.Fk_CriteriaId === 1 ? 'ind' : row.Fk_CriteriaId === 2 ? 'bep' : 'university-reports';
        await insertCms(
          clonePool,
          mk,
          {
            title: row.Title,
            filePath: row.URL,
            fileName: fileName(row.URL),
            fileType: row.FileType,
            category: row.Fk_CriteriaId != null ? `criteria:${row.Fk_CriteriaId}` : null,
            publishDate: row.UploadDate || row.CreateON,
            isPublished: bool(row.IsActive, true),
          },
          adminId,
          deptMap
        );
      }
      console.log(`  University_Document: ${udocs.length}`);
    } catch (err) {
      console.log(`  University_Document skipped: ${err.message}`);
    }

    console.log('\n[4] Rebuilding Notices (Dept_Notecboard + NoticeBoard holidaylist)…');
    await clonePool.request().query(`DELETE FROM dbo.Notices`);
    let noticeCount = 0;
    for (const row of await selectAll(
      sourcePool,
      `SELECT Notice_Board, URL, Type, IsActive, Date, CreatedDate FROM dbo.Dept_Notecboard
       WHERE ISNULL(IsDeleted,0)=0 AND Notice_Board IS NOT NULL`
    )) {
      await clonePool
        .request()
        .input('title', sql.NVarChar, trunc(row.Notice_Board, 500))
        .input('category', sql.NVarChar, trunc(row.Type || 'Notice', 100))
        .input('filePath', sql.NVarChar, trunc(row.URL, 500))
        .input('fileName', sql.NVarChar, trunc(fileName(row.URL), 255))
        .input('publishDate', sql.Date, row.Date || row.CreatedDate || null)
        .input('isPublished', sql.Bit, bool(row.IsActive, true))
        .input('userId', sql.Int, adminId)
        .query(`
          INSERT INTO dbo.Notices
            (Title, Category, FilePath, FileName, PublishDate, IsPublished, CreatedBy, UpdatedBy)
          VALUES (@title, @category, @filePath, @fileName, @publishDate, @isPublished, @userId, @userId)
        `);
      noticeCount += 1;
    }
    for (const row of await selectAll(
      sourcePool,
      `SELECT Notice_Board, URL, Type, IsActive, Date, FileType FROM dbo.Acadmic_Holidaylist
       WHERE ISNULL(IsDeleted,0)=0 AND Type=N'NoticeBoard' AND Notice_Board IS NOT NULL`
    )) {
      await clonePool
        .request()
        .input('title', sql.NVarChar, trunc(row.Notice_Board, 500))
        .input('category', sql.NVarChar, trunc(row.Type || 'NoticeBoard', 100))
        .input('filePath', sql.NVarChar, trunc(row.URL, 500))
        .input('fileName', sql.NVarChar, trunc(fileName(row.URL), 255))
        .input('fileType', sql.NVarChar, trunc(row.FileType, 100))
        .input('publishDate', sql.Date, row.Date || null)
        .input('isPublished', sql.Bit, bool(row.IsActive, true))
        .input('userId', sql.Int, adminId)
        .query(`
          INSERT INTO dbo.Notices
            (Title, Category, FilePath, FileName, FileType, PublishDate, IsPublished, CreatedBy, UpdatedBy)
          VALUES (@title, @category, @filePath, @fileName, @fileType, @publishDate, @isPublished, @userId, @userId)
        `);
      noticeCount += 1;
    }
    console.log(`  Notices total: ${noticeCount}`);
    bump('Notices', noticeCount);

    console.log('\n========== CMS IMPORT SUMMARY ==========');
    Object.entries(stats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    console.log('========================================');
    console.log('Done. Source DB was not modified.');
  } finally {
    await sourcePool.close();
    await clonePool.close();
  }
}

main().catch((err) => {
  console.error('\nFAILED:', err);
  process.exit(1);
});

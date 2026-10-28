const { query } = require('../config/database');
const { parsePagination, buildPagedResult } = require('../utils/pagination');
const { toPublicPath, safeDeleteFile } = require('../utils/fileHelper');

async function list(moduleKey, filters = {}) {
  const { page, limit, offset } = parsePagination(filters);
  const search = filters.search ? `%${filters.search}%` : null;
  const departmentId = filters.departmentId ? parseInt(filters.departmentId, 10) : null;
  const isPublished =
    filters.isPublished === undefined || filters.isPublished === ''
      ? null
      : filters.isPublished === 'true' || filters.isPublished === true || filters.isPublished === '1';

  const result = await query(
    `
    SELECT c.*, d.Name AS DepartmentName,
           COUNT(*) OVER() AS TotalCount
    FROM dbo.CmsEntries c
    LEFT JOIN dbo.Departments d ON d.Id = c.DepartmentId
    WHERE c.ModuleKey = @moduleKey
      AND (@search IS NULL OR c.Title LIKE @search OR c.Caption LIKE @search OR c.Description LIKE @search)
      AND (@departmentId IS NULL OR c.DepartmentId = @departmentId)
      AND (@isPublished IS NULL OR c.IsPublished = @isPublished)
    ORDER BY c.Priority DESC, c.Id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
    { moduleKey, search, departmentId, isPublished, offset, limit }
  );

  const total = result.recordset[0]?.TotalCount || 0;
  const items = result.recordset.map(({ TotalCount, ...row }) => row);
  return buildPagedResult(items, total, page, limit);
}

async function getById(moduleKey, id) {
  const result = await query(
    `
    SELECT c.*, d.Name AS DepartmentName
    FROM dbo.CmsEntries c
    LEFT JOIN dbo.Departments d ON d.Id = c.DepartmentId
    WHERE c.Id = @id AND c.ModuleKey = @moduleKey
    `,
    { id, moduleKey }
  );
  return result.recordset[0] || null;
}

function bool(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

async function create(moduleKey, data, files, userId) {
  const image = files?.image?.[0] || files?.file?.[0];
  const doc = files?.document?.[0];
  const imagePath = image && image.mimetype?.startsWith('image/')
    ? toPublicPath('cms', image.filename)
    : null;
  const filePath = doc
    ? toPublicPath('cms', doc.filename)
    : image && !image.mimetype?.startsWith('image/')
      ? toPublicPath('cms', image.filename)
      : null;

  const result = await query(
    `
    INSERT INTO dbo.CmsEntries
      (ModuleKey, DepartmentId, Title, Caption, Description, Category, LinkUrl,
       ImagePath, ImageName, FilePath, FileName, FileType, Priority, IsPublished, PublishDate,
       CreatedBy, UpdatedBy)
    OUTPUT INSERTED.*
    VALUES
      (@moduleKey, @departmentId, @title, @caption, @description, @category, @linkUrl,
       @imagePath, @imageName, @filePath, @fileName, @fileType, @priority, @isPublished, @publishDate,
       @userId, @userId)
    `,
    {
      moduleKey,
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
      title: data.title,
      caption: data.caption || null,
      description: data.description || null,
      category: data.category || null,
      linkUrl: data.linkUrl || null,
      imagePath,
      imageName: imagePath ? image.originalname : null,
      filePath,
      fileName: filePath ? (doc || image).originalname : null,
      fileType: filePath ? (doc || image).mimetype : null,
      priority: parseInt(data.priority || '0', 10) || 0,
      isPublished: bool(data.isPublished),
      publishDate: data.publishDate || null,
      userId,
    }
  );
  return result.recordset[0];
}

async function update(moduleKey, id, data, files, userId) {
  const existing = await getById(moduleKey, id);
  if (!existing) return null;

  const image = files?.image?.[0] || files?.file?.[0];
  const doc = files?.document?.[0];

  let imagePath = existing.ImagePath;
  let imageName = existing.ImageName;
  let filePath = existing.FilePath;
  let fileName = existing.FileName;
  let fileType = existing.FileType;
  const oldImage = existing.ImagePath;
  const oldFile = existing.FilePath;

  if (image) {
    if (image.mimetype?.startsWith('image/')) {
      imagePath = toPublicPath('cms', image.filename);
      imageName = image.originalname;
    } else {
      filePath = toPublicPath('cms', image.filename);
      fileName = image.originalname;
      fileType = image.mimetype;
    }
  }
  if (doc) {
    filePath = toPublicPath('cms', doc.filename);
    fileName = doc.originalname;
    fileType = doc.mimetype;
  }

  const result = await query(
    `
    UPDATE dbo.CmsEntries
    SET DepartmentId = @departmentId,
        Title = @title,
        Caption = @caption,
        Description = @description,
        Category = @category,
        LinkUrl = @linkUrl,
        ImagePath = @imagePath,
        ImageName = @imageName,
        FilePath = @filePath,
        FileName = @fileName,
        FileType = @fileType,
        Priority = @priority,
        IsPublished = @isPublished,
        PublishDate = @publishDate,
        UpdatedBy = @userId,
        UpdatedAt = SYSUTCDATETIME()
    OUTPUT INSERTED.*
    WHERE Id = @id AND ModuleKey = @moduleKey
    `,
    {
      id,
      moduleKey,
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
      title: data.title,
      caption: data.caption || null,
      description: data.description || null,
      category: data.category || null,
      linkUrl: data.linkUrl || null,
      imagePath,
      imageName,
      filePath,
      fileName,
      fileType,
      priority: parseInt(data.priority || '0', 10) || 0,
      isPublished: bool(data.isPublished),
      publishDate: data.publishDate || null,
      userId,
    }
  );

  if (image && image.mimetype?.startsWith('image/') && oldImage) safeDeleteFile(oldImage);
  if ((doc || (image && !image.mimetype?.startsWith('image/'))) && oldFile) safeDeleteFile(oldFile);

  return result.recordset[0];
}

async function remove(moduleKey, id) {
  const existing = await getById(moduleKey, id);
  if (!existing) return null;
  await query(`DELETE FROM dbo.CmsEntries WHERE Id = @id AND ModuleKey = @moduleKey`, { id, moduleKey });
  if (existing.ImagePath) safeDeleteFile(existing.ImagePath);
  if (existing.FilePath) safeDeleteFile(existing.FilePath);
  return existing;
}

module.exports = { list, getById, create, update, remove };

const { query } = require('../config/database');
const { parsePagination, buildPagedResult } = require('../utils/pagination');
const { toPublicPath, safeDeleteFile } = require('../utils/fileHelper');

async function list(filters = {}) {
  const { page, limit, offset } = parsePagination(filters);
  const search = filters.search ? `%${filters.search}%` : null;
  const departmentId = filters.departmentId ? parseInt(filters.departmentId, 10) : null;
  const isPublished =
    filters.isPublished === undefined || filters.isPublished === ''
      ? null
      : filters.isPublished === 'true' || filters.isPublished === true || filters.isPublished === '1';
  const category = filters.category || null;

  const result = await query(
    `
    SELECT n.*, d.Name AS DepartmentName,
           COUNT(*) OVER() AS TotalCount
    FROM dbo.Notices n
    LEFT JOIN dbo.Departments d ON d.Id = n.DepartmentId
    WHERE (@search IS NULL OR n.Title LIKE @search OR n.Description LIKE @search)
      AND (@departmentId IS NULL OR n.DepartmentId = @departmentId)
      AND (@isPublished IS NULL OR n.IsPublished = @isPublished)
      AND (@category IS NULL OR n.Category = @category)
    ORDER BY n.Id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
    { search, departmentId, isPublished, category, offset, limit }
  );

  const total = result.recordset[0]?.TotalCount || 0;
  const items = result.recordset.map(({ TotalCount, ...row }) => row);
  return buildPagedResult(items, total, page, limit);
}

async function getById(id) {
  const result = await query(
    `
    SELECT n.*, d.Name AS DepartmentName
    FROM dbo.Notices n
    LEFT JOIN dbo.Departments d ON d.Id = n.DepartmentId
    WHERE n.Id = @id
    `,
    { id }
  );
  return result.recordset[0] || null;
}

async function create(data, file, userId) {
  const filePath = file ? toPublicPath('notices', file.filename) : null;
  const result = await query(
    `
    INSERT INTO dbo.Notices
      (DepartmentId, Title, Description, Category, FilePath, FileName, FileType, PublishDate, IsPublished, CreatedBy, UpdatedBy)
    OUTPUT INSERTED.*
    VALUES
      (@departmentId, @title, @description, @category, @filePath, @fileName, @fileType, @publishDate, @isPublished, @userId, @userId)
    `,
    {
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      filePath,
      fileName: file?.originalname || null,
      fileType: file?.mimetype || null,
      publishDate: data.publishDate || null,
      isPublished: data.isPublished === true || data.isPublished === 'true' || data.isPublished === '1',
      userId,
    }
  );
  return result.recordset[0];
}

async function update(id, data, file, userId) {
  const existing = await getById(id);
  if (!existing) return null;

  let filePath = existing.FilePath;
  let fileName = existing.FileName;
  let fileType = existing.FileType;
  const oldPath = existing.FilePath;

  if (file) {
    filePath = toPublicPath('notices', file.filename);
    fileName = file.originalname;
    fileType = file.mimetype;
  }

  const result = await query(
    `
    UPDATE dbo.Notices
    SET DepartmentId = @departmentId,
        Title = @title,
        Description = @description,
        Category = @category,
        FilePath = @filePath,
        FileName = @fileName,
        FileType = @fileType,
        PublishDate = @publishDate,
        IsPublished = @isPublished,
        UpdatedBy = @userId,
        UpdatedAt = SYSUTCDATETIME()
    OUTPUT INSERTED.*
    WHERE Id = @id
    `,
    {
      id,
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      filePath,
      fileName,
      fileType,
      publishDate: data.publishDate || null,
      isPublished: data.isPublished === true || data.isPublished === 'true' || data.isPublished === '1',
      userId,
    }
  );

  if (file && oldPath) safeDeleteFile(oldPath);
  return result.recordset[0];
}

async function remove(id) {
  const existing = await getById(id);
  if (!existing) return null;
  await query(`DELETE FROM dbo.Notices WHERE Id = @id`, { id });
  if (existing.FilePath) safeDeleteFile(existing.FilePath);
  return existing;
}

module.exports = { list, getById, create, update, remove };

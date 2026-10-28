const { query } = require('../config/database');
const { parsePagination, buildPagedResult } = require('../utils/pagination');
const { toPublicPath, safeDeleteFile } = require('../utils/fileHelper');

async function list(filters = {}) {
  const { page, limit, offset } = parsePagination(filters);
  const search = filters.search ? `%${filters.search}%` : null;
  const departmentId = filters.departmentId ? parseInt(filters.departmentId, 10) : null;
  const category = filters.category || null;
  const isPublished =
    filters.isPublished === undefined || filters.isPublished === ''
      ? null
      : filters.isPublished === 'true' || filters.isPublished === true || filters.isPublished === '1';

  const result = await query(
    `
    SELECT d.*, dept.Name AS DepartmentName,
           COUNT(*) OVER() AS TotalCount
    FROM dbo.Documents d
    LEFT JOIN dbo.Departments dept ON dept.Id = d.DepartmentId
    WHERE (@search IS NULL OR d.Title LIKE @search OR d.Description LIKE @search)
      AND (@departmentId IS NULL OR d.DepartmentId = @departmentId)
      AND (@category IS NULL OR d.Category = @category)
      AND (@isPublished IS NULL OR d.IsPublished = @isPublished)
    ORDER BY d.Id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
    { search, departmentId, category, isPublished, offset, limit }
  );

  const total = result.recordset[0]?.TotalCount || 0;
  const items = result.recordset.map(({ TotalCount, ...row }) => row);
  return buildPagedResult(items, total, page, limit);
}

async function getById(id) {
  const result = await query(
    `
    SELECT d.*, dept.Name AS DepartmentName
    FROM dbo.Documents d
    LEFT JOIN dbo.Departments dept ON dept.Id = d.DepartmentId
    WHERE d.Id = @id
    `,
    { id }
  );
  return result.recordset[0] || null;
}

async function create(data, file, userId) {
  const filePath = file ? toPublicPath('documents', file.filename) : null;
  const result = await query(
    `
    INSERT INTO dbo.Documents
      (DepartmentId, Title, Category, Description, FilePath, FileName, FileType, FileSize, IsPublished, CreatedBy, UpdatedBy)
    OUTPUT INSERTED.*
    VALUES
      (@departmentId, @title, @category, @description, @filePath, @fileName, @fileType, @fileSize, @isPublished, @userId, @userId)
    `,
    {
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
      title: data.title,
      category: data.category || null,
      description: data.description || null,
      filePath,
      fileName: file?.originalname || null,
      fileType: file?.mimetype || null,
      fileSize: file?.size || null,
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
  let fileSize = existing.FileSize;
  const oldPath = existing.FilePath;

  if (file) {
    filePath = toPublicPath('documents', file.filename);
    fileName = file.originalname;
    fileType = file.mimetype;
    fileSize = file.size;
  }

  const result = await query(
    `
    UPDATE dbo.Documents
    SET DepartmentId = @departmentId,
        Title = @title,
        Category = @category,
        Description = @description,
        FilePath = @filePath,
        FileName = @fileName,
        FileType = @fileType,
        FileSize = @fileSize,
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
      category: data.category || null,
      description: data.description || null,
      filePath,
      fileName,
      fileType,
      fileSize,
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
  await query(`DELETE FROM dbo.Documents WHERE Id = @id`, { id });
  if (existing.FilePath) safeDeleteFile(existing.FilePath);
  return existing;
}

module.exports = { list, getById, create, update, remove };

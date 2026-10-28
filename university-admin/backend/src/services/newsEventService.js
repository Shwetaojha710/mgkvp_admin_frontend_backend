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

  const result = await query(
    `
    SELECT n.*, d.Name AS DepartmentName,
           COUNT(*) OVER() AS TotalCount
    FROM dbo.NewsEvents n
    LEFT JOIN dbo.Departments d ON d.Id = n.DepartmentId
    WHERE (@search IS NULL OR n.Title LIKE @search OR n.Summary LIKE @search)
      AND (@departmentId IS NULL OR n.DepartmentId = @departmentId)
      AND (@isPublished IS NULL OR n.IsPublished = @isPublished)
    ORDER BY n.Priority DESC, n.Id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
    { search, departmentId, isPublished, offset, limit }
  );

  const total = result.recordset[0]?.TotalCount || 0;
  const items = result.recordset.map(({ TotalCount, ...row }) => row);
  return buildPagedResult(items, total, page, limit);
}

async function getById(id) {
  const result = await query(
    `
    SELECT n.*, d.Name AS DepartmentName
    FROM dbo.NewsEvents n
    LEFT JOIN dbo.Departments d ON d.Id = n.DepartmentId
    WHERE n.Id = @id
    `,
    { id }
  );
  return result.recordset[0] || null;
}

async function create(data, file, userId) {
  const imagePath = file ? toPublicPath('news', file.filename) : null;
  const result = await query(
    `
    INSERT INTO dbo.NewsEvents
      (DepartmentId, Title, Summary, Content, EventDate, ImagePath, ImageName, Priority, IsPublished, CreatedBy, UpdatedBy)
    OUTPUT INSERTED.*
    VALUES
      (@departmentId, @title, @summary, @content, @eventDate, @imagePath, @imageName, @priority, @isPublished, @userId, @userId)
    `,
    {
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
      title: data.title,
      summary: data.summary || null,
      content: data.content || null,
      eventDate: data.eventDate || null,
      imagePath,
      imageName: file?.originalname || null,
      priority: parseInt(data.priority || '0', 10) || 0,
      isPublished: data.isPublished === true || data.isPublished === 'true' || data.isPublished === '1',
      userId,
    }
  );
  return result.recordset[0];
}

async function update(id, data, file, userId) {
  const existing = await getById(id);
  if (!existing) return null;

  let imagePath = existing.ImagePath;
  let imageName = existing.ImageName;
  const oldPath = existing.ImagePath;

  if (file) {
    imagePath = toPublicPath('news', file.filename);
    imageName = file.originalname;
  }

  const result = await query(
    `
    UPDATE dbo.NewsEvents
    SET DepartmentId = @departmentId,
        Title = @title,
        Summary = @summary,
        Content = @content,
        EventDate = @eventDate,
        ImagePath = @imagePath,
        ImageName = @imageName,
        Priority = @priority,
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
      summary: data.summary || null,
      content: data.content || null,
      eventDate: data.eventDate || null,
      imagePath,
      imageName,
      priority: parseInt(data.priority || '0', 10) || 0,
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
  await query(`DELETE FROM dbo.NewsEvents WHERE Id = @id`, { id });
  if (existing.ImagePath) safeDeleteFile(existing.ImagePath);
  return existing;
}

module.exports = { list, getById, create, update, remove };

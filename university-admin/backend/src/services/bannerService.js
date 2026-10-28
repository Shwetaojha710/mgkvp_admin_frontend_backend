const { query } = require('../config/database');
const { parsePagination, buildPagedResult } = require('../utils/pagination');
const { toPublicPath, safeDeleteFile } = require('../utils/fileHelper');

async function list(filters = {}) {
  const { page, limit, offset } = parsePagination(filters);
  const search = filters.search ? `%${filters.search}%` : null;
  const departmentId = filters.departmentId ? parseInt(filters.departmentId, 10) : null;
  const isActive =
    filters.isActive === undefined || filters.isActive === ''
      ? null
      : filters.isActive === 'true' || filters.isActive === true || filters.isActive === '1';

  const result = await query(
    `
    SELECT b.*, d.Name AS DepartmentName,
           COUNT(*) OVER() AS TotalCount
    FROM dbo.Banners b
    LEFT JOIN dbo.Departments d ON d.Id = b.DepartmentId
    WHERE (@search IS NULL OR b.Title LIKE @search OR b.Caption LIKE @search)
      AND (@departmentId IS NULL OR b.DepartmentId = @departmentId)
      AND (@isActive IS NULL OR b.IsActive = @isActive)
    ORDER BY b.Priority DESC, b.Id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
    { search, departmentId, isActive, offset, limit }
  );

  const total = result.recordset[0]?.TotalCount || 0;
  const items = result.recordset.map(({ TotalCount, ...row }) => row);
  return buildPagedResult(items, total, page, limit);
}

async function getById(id) {
  const result = await query(
    `
    SELECT b.*, d.Name AS DepartmentName
    FROM dbo.Banners b
    LEFT JOIN dbo.Departments d ON d.Id = b.DepartmentId
    WHERE b.Id = @id
    `,
    { id }
  );
  return result.recordset[0] || null;
}

async function create(data, file, userId) {
  const imagePath = file ? toPublicPath('banners', file.filename) : null;
  const result = await query(
    `
    INSERT INTO dbo.Banners
      (DepartmentId, Title, Caption, ImagePath, ImageName, ImageType, Priority, IsActive, CreatedBy, UpdatedBy)
    OUTPUT INSERTED.*
    VALUES
      (@departmentId, @title, @caption, @imagePath, @imageName, @imageType, @priority, @isActive, @userId, @userId)
    `,
    {
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
      title: data.title,
      caption: data.caption || null,
      imagePath,
      imageName: file?.originalname || null,
      imageType: file?.mimetype || null,
      priority: parseInt(data.priority || '0', 10) || 0,
      isActive: data.isActive === true || data.isActive === 'true' || data.isActive === '1',
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
  let imageType = existing.ImageType;
  const oldPath = existing.ImagePath;

  if (file) {
    imagePath = toPublicPath('banners', file.filename);
    imageName = file.originalname;
    imageType = file.mimetype;
  }

  const result = await query(
    `
    UPDATE dbo.Banners
    SET DepartmentId = @departmentId,
        Title = @title,
        Caption = @caption,
        ImagePath = @imagePath,
        ImageName = @imageName,
        ImageType = @imageType,
        Priority = @priority,
        IsActive = @isActive,
        UpdatedBy = @userId,
        UpdatedAt = SYSUTCDATETIME()
    OUTPUT INSERTED.*
    WHERE Id = @id
    `,
    {
      id,
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
      title: data.title,
      caption: data.caption || null,
      imagePath,
      imageName,
      imageType,
      priority: parseInt(data.priority || '0', 10) || 0,
      isActive: data.isActive === true || data.isActive === 'true' || data.isActive === '1',
      userId,
    }
  );

  if (file && oldPath) {
    safeDeleteFile(oldPath);
  }

  return result.recordset[0];
}

async function remove(id) {
  const existing = await getById(id);
  if (!existing) return null;
  await query(`DELETE FROM dbo.Banners WHERE Id = @id`, { id });
  if (existing.ImagePath) {
    safeDeleteFile(existing.ImagePath);
  }
  return existing;
}

module.exports = { list, getById, create, update, remove };

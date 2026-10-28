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
    SELECT f.*, d.Name AS DepartmentName,
           COUNT(*) OVER() AS TotalCount
    FROM dbo.Faculty f
    LEFT JOIN dbo.Departments d ON d.Id = f.DepartmentId
    WHERE (@search IS NULL OR f.FullName LIKE @search OR f.Designation LIKE @search OR f.Email LIKE @search)
      AND (@departmentId IS NULL OR f.DepartmentId = @departmentId)
      AND (@isActive IS NULL OR f.IsActive = @isActive)
    ORDER BY f.FullName
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
    SELECT f.*, d.Name AS DepartmentName
    FROM dbo.Faculty f
    LEFT JOIN dbo.Departments d ON d.Id = f.DepartmentId
    WHERE f.Id = @id
    `,
    { id }
  );
  return result.recordset[0] || null;
}

async function create(data, file, userId) {
  const photoPath = file ? toPublicPath('faculty', file.filename) : null;
  const result = await query(
    `
    INSERT INTO dbo.Faculty
      (DepartmentId, FullName, Designation, Email, Phone, Bio, PhotoPath, PhotoName, IsActive, CreatedBy, UpdatedBy)
    OUTPUT INSERTED.*
    VALUES
      (@departmentId, @fullName, @designation, @email, @phone, @bio, @photoPath, @photoName, @isActive, @userId, @userId)
    `,
    {
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
      fullName: data.fullName,
      designation: data.designation || null,
      email: data.email || null,
      phone: data.phone || null,
      bio: data.bio || null,
      photoPath,
      photoName: file?.originalname || null,
      isActive: data.isActive === false || data.isActive === 'false' ? false : true,
      userId,
    }
  );
  return result.recordset[0];
}

async function update(id, data, file, userId) {
  const existing = await getById(id);
  if (!existing) return null;

  let photoPath = existing.PhotoPath;
  let photoName = existing.PhotoName;
  const oldPath = existing.PhotoPath;

  if (file) {
    photoPath = toPublicPath('faculty', file.filename);
    photoName = file.originalname;
  }

  const result = await query(
    `
    UPDATE dbo.Faculty
    SET DepartmentId = @departmentId,
        FullName = @fullName,
        Designation = @designation,
        Email = @email,
        Phone = @phone,
        Bio = @bio,
        PhotoPath = @photoPath,
        PhotoName = @photoName,
        IsActive = @isActive,
        UpdatedBy = @userId,
        UpdatedAt = SYSUTCDATETIME()
    OUTPUT INSERTED.*
    WHERE Id = @id
    `,
    {
      id,
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
      fullName: data.fullName,
      designation: data.designation || null,
      email: data.email || null,
      phone: data.phone || null,
      bio: data.bio || null,
      photoPath,
      photoName,
      isActive: data.isActive === false || data.isActive === 'false' ? false : true,
      userId,
    }
  );

  if (file && oldPath) safeDeleteFile(oldPath);
  return result.recordset[0];
}

async function remove(id) {
  const existing = await getById(id);
  if (!existing) return null;
  await query(`DELETE FROM dbo.Faculty WHERE Id = @id`, { id });
  if (existing.PhotoPath) safeDeleteFile(existing.PhotoPath);
  return existing;
}

module.exports = { list, getById, create, update, remove };

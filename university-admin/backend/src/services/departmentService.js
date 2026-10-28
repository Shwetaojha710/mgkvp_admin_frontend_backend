const { query } = require('../config/database');
const { parsePagination, buildPagedResult } = require('../utils/pagination');

async function list(filters = {}) {
  const { page, limit, offset } = parsePagination(filters);
  const search = filters.search ? `%${filters.search}%` : null;
  const isActive =
    filters.isActive === undefined || filters.isActive === ''
      ? null
      : filters.isActive === 'true' || filters.isActive === true || filters.isActive === '1';

  const result = await query(
    `
    SELECT d.*,
           COUNT(*) OVER() AS TotalCount
    FROM dbo.Departments d
    WHERE (@search IS NULL OR d.Name LIKE @search OR d.Code LIKE @search)
      AND (@isActive IS NULL OR d.IsActive = @isActive)
    ORDER BY d.Name
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
    { search, isActive, offset, limit }
  );

  const total = result.recordset[0]?.TotalCount || 0;
  const items = result.recordset.map(({ TotalCount, ...row }) => row);
  return buildPagedResult(items, total, page, limit);
}

async function getById(id) {
  const result = await query(`SELECT * FROM dbo.Departments WHERE Id = @id`, { id });
  return result.recordset[0] || null;
}

async function create(data, userId) {
  const result = await query(
    `
    INSERT INTO dbo.Departments (Name, Code, Description, IsActive, CreatedBy, UpdatedBy)
    OUTPUT INSERTED.*
    VALUES (@name, @code, @description, @isActive, @userId, @userId)
    `,
    {
      name: data.name,
      code: data.code || null,
      description: data.description || null,
      isActive: data.isActive === false || data.isActive === 'false' ? false : true,
      userId,
    }
  );
  return result.recordset[0];
}

async function update(id, data, userId) {
  const existing = await getById(id);
  if (!existing) return null;

  const result = await query(
    `
    UPDATE dbo.Departments
    SET Name = @name,
        Code = @code,
        Description = @description,
        IsActive = @isActive,
        UpdatedBy = @userId,
        UpdatedAt = SYSUTCDATETIME()
    OUTPUT INSERTED.*
    WHERE Id = @id
    `,
    {
      id,
      name: data.name,
      code: data.code || null,
      description: data.description || null,
      isActive: data.isActive === false || data.isActive === 'false' ? false : true,
      userId,
    }
  );
  return result.recordset[0];
}

async function remove(id) {
  const existing = await getById(id);
  if (!existing) return null;
  await query(`DELETE FROM dbo.Departments WHERE Id = @id`, { id });
  return existing;
}

async function listAllActive() {
  const result = await query(
    `SELECT Id, Name, Code FROM dbo.Departments WHERE IsActive = 1 ORDER BY Name`
  );
  return result.recordset;
}

module.exports = { list, getById, create, update, remove, listAllActive };

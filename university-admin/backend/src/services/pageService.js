const { query } = require('../config/database');
const { parsePagination, buildPagedResult } = require('../utils/pagination');

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function list(filters = {}) {
  const { page, limit, offset } = parsePagination(filters);
  const search = filters.search ? `%${filters.search}%` : null;
  const isPublished =
    filters.isPublished === undefined || filters.isPublished === ''
      ? null
      : filters.isPublished === 'true' || filters.isPublished === true || filters.isPublished === '1';
  const category = filters.category || null;

  const result = await query(
    `
    SELECT p.*, COUNT(*) OVER() AS TotalCount
    FROM dbo.Pages p
    WHERE (@search IS NULL OR p.Title LIKE @search OR p.Slug LIKE @search)
      AND (@isPublished IS NULL OR p.IsPublished = @isPublished)
      AND (@category IS NULL OR p.Category = @category)
    ORDER BY p.Id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
    { search, isPublished, category, offset, limit }
  );

  const total = result.recordset[0]?.TotalCount || 0;
  const items = result.recordset.map(({ TotalCount, ...row }) => row);
  return buildPagedResult(items, total, page, limit);
}

async function getById(id) {
  const result = await query(`SELECT * FROM dbo.Pages WHERE Id = @id`, { id });
  return result.recordset[0] || null;
}

async function create(data, userId) {
  const slug = data.slug ? slugify(data.slug) : slugify(data.title);
  const result = await query(
    `
    INSERT INTO dbo.Pages (Title, Slug, Content, Category, IsPublished, CreatedBy, UpdatedBy)
    OUTPUT INSERTED.*
    VALUES (@title, @slug, @content, @category, @isPublished, @userId, @userId)
    `,
    {
      title: data.title,
      slug,
      content: data.content || null,
      category: data.category || null,
      isPublished: data.isPublished === true || data.isPublished === 'true' || data.isPublished === '1',
      userId,
    }
  );
  return result.recordset[0];
}

async function update(id, data, userId) {
  const existing = await getById(id);
  if (!existing) return null;

  const slug = data.slug ? slugify(data.slug) : slugify(data.title);
  const result = await query(
    `
    UPDATE dbo.Pages
    SET Title = @title,
        Slug = @slug,
        Content = @content,
        Category = @category,
        IsPublished = @isPublished,
        UpdatedBy = @userId,
        UpdatedAt = SYSUTCDATETIME()
    OUTPUT INSERTED.*
    WHERE Id = @id
    `,
    {
      id,
      title: data.title,
      slug,
      content: data.content || null,
      category: data.category || null,
      isPublished: data.isPublished === true || data.isPublished === 'true' || data.isPublished === '1',
      userId,
    }
  );
  return result.recordset[0];
}

async function remove(id) {
  const existing = await getById(id);
  if (!existing) return null;
  await query(`DELETE FROM dbo.Pages WHERE Id = @id`, { id });
  return existing;
}

module.exports = { list, getById, create, update, remove };

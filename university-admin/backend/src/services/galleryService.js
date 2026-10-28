const { query, getPool, sql } = require('../config/database');
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
    SELECT g.*, d.Name AS DepartmentName,
           (SELECT COUNT(*) FROM dbo.GalleryImages gi WHERE gi.GalleryId = g.Id) AS ImageCount,
           COUNT(*) OVER() AS TotalCount
    FROM dbo.Galleries g
    LEFT JOIN dbo.Departments d ON d.Id = g.DepartmentId
    WHERE (@search IS NULL OR g.Title LIKE @search OR g.Description LIKE @search)
      AND (@departmentId IS NULL OR g.DepartmentId = @departmentId)
      AND (@isPublished IS NULL OR g.IsPublished = @isPublished)
    ORDER BY g.Id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
    { search, departmentId, isPublished, offset, limit }
  );

  const total = result.recordset[0]?.TotalCount || 0;
  const items = result.recordset.map(({ TotalCount, ...row }) => row);
  return buildPagedResult(items, total, page, limit);
}

async function getById(id) {
  const galleryResult = await query(
    `
    SELECT g.*, d.Name AS DepartmentName
    FROM dbo.Galleries g
    LEFT JOIN dbo.Departments d ON d.Id = g.DepartmentId
    WHERE g.Id = @id
    `,
    { id }
  );
  const gallery = galleryResult.recordset[0];
  if (!gallery) return null;

  const images = await query(
    `SELECT * FROM dbo.GalleryImages WHERE GalleryId = @id ORDER BY SortOrder, Id`,
    { id }
  );
  return { ...gallery, images: images.recordset };
}

async function create(data, file, userId) {
  const coverImagePath = file ? toPublicPath('galleries', file.filename) : null;
  const result = await query(
    `
    INSERT INTO dbo.Galleries
      (DepartmentId, Title, Description, CoverImagePath, CoverImageName, IsPublished, CreatedBy, UpdatedBy)
    OUTPUT INSERTED.*
    VALUES
      (@departmentId, @title, @description, @coverImagePath, @coverImageName, @isPublished, @userId, @userId)
    `,
    {
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
      title: data.title,
      description: data.description || null,
      coverImagePath,
      coverImageName: file?.originalname || null,
      isPublished: data.isPublished === true || data.isPublished === 'true' || data.isPublished === '1',
      userId,
    }
  );
  return result.recordset[0];
}

async function update(id, data, file, userId) {
  const existing = await getById(id);
  if (!existing) return null;

  let coverImagePath = existing.CoverImagePath;
  let coverImageName = existing.CoverImageName;
  const oldPath = existing.CoverImagePath;

  if (file) {
    coverImagePath = toPublicPath('galleries', file.filename);
    coverImageName = file.originalname;
  }

  const result = await query(
    `
    UPDATE dbo.Galleries
    SET DepartmentId = @departmentId,
        Title = @title,
        Description = @description,
        CoverImagePath = @coverImagePath,
        CoverImageName = @coverImageName,
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
      coverImagePath,
      coverImageName,
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

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const req = new sql.Request(transaction);
    req.input('id', sql.Int, id);
    const imgs = await req.query(`SELECT ImagePath FROM dbo.GalleryImages WHERE GalleryId = @id`);
    await req.query(`DELETE FROM dbo.GalleryImages WHERE GalleryId = @id`);
    await req.query(`DELETE FROM dbo.Galleries WHERE Id = @id`);
    await transaction.commit();

    imgs.recordset.forEach((img) => safeDeleteFile(img.ImagePath));
    if (existing.CoverImagePath) safeDeleteFile(existing.CoverImagePath);
    return existing;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Flat list of gallery images (reference GalleryList).
 * Filters: albumId (GalleryId), search, isActive (via parent or image type unused — use all)
 */
async function listImages(filters = {}) {
  const { page, limit, offset } = parsePagination(filters);
  const search = filters.search ? `%${filters.search}%` : null;
  const albumId = filters.albumId ? parseInt(filters.albumId, 10) : null;

  const result = await query(
    `
    SELECT gi.*,
           g.Title AS AlbumName,
           g.Id AS AlbumId,
           COUNT(*) OVER() AS TotalCount
    FROM dbo.GalleryImages gi
    INNER JOIN dbo.Galleries g ON g.Id = gi.GalleryId
    WHERE (@albumId IS NULL OR gi.GalleryId = @albumId)
      AND (@search IS NULL OR gi.Title LIKE @search OR g.Title LIKE @search)
    ORDER BY gi.Id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `,
    { albumId, search, offset, limit }
  );

  const total = result.recordset[0]?.TotalCount || 0;
  const items = result.recordset.map(({ TotalCount, ...row }) => row);
  return buildPagedResult(items, total, page, limit);
}

async function getImageById(imageId) {
  const result = await query(
    `
    SELECT gi.*, g.Title AS AlbumName, g.Id AS AlbumId
    FROM dbo.GalleryImages gi
    INNER JOIN dbo.Galleries g ON g.Id = gi.GalleryId
    WHERE gi.Id = @imageId
    `,
    { imageId }
  );
  return result.recordset[0] || null;
}

async function updateImage(imageId, data, file) {
  const existing = await getImageById(imageId);
  if (!existing) return null;

  let imagePath = existing.ImagePath;
  let imageName = existing.ImageName;
  let imageType = existing.ImageType;
  const oldPath = existing.ImagePath;

  if (file) {
    imagePath = toPublicPath('galleries', file.filename);
    imageName = file.originalname;
    imageType = file.mimetype;
  }

  const result = await query(
    `
    UPDATE dbo.GalleryImages
    SET GalleryId = @galleryId,
        Title = @title,
        ImagePath = @imagePath,
        ImageName = @imageName,
        ImageType = @imageType,
        SortOrder = @sortOrder
    OUTPUT INSERTED.*
    WHERE Id = @imageId
    `,
    {
      imageId,
      galleryId: data.galleryId ? parseInt(data.galleryId, 10) : existing.GalleryId,
      title: data.title || null,
      imagePath,
      imageName,
      imageType,
      sortOrder: parseInt(data.sortOrder || existing.SortOrder || '0', 10) || 0,
    }
  );

  if (file && oldPath && !String(oldPath).startsWith('~/') && !/^https?:/i.test(oldPath) && !/^\/?Uploads\//i.test(oldPath)) {
    safeDeleteFile(oldPath);
  }

  return result.recordset[0];
}

async function addImage(galleryId, file, title, sortOrder = 0) {
  const gallery = await getById(galleryId);
  if (!gallery) return null;
  if (!file) {
    const err = new Error('Image file is required');
    err.status = 400;
    throw err;
  }

  const imagePath = toPublicPath('galleries', file.filename);
  const result = await query(
    `
    INSERT INTO dbo.GalleryImages (GalleryId, Title, ImagePath, ImageName, ImageType, SortOrder)
    OUTPUT INSERTED.*
    VALUES (@galleryId, @title, @imagePath, @imageName, @imageType, @sortOrder)
    `,
    {
      galleryId,
      title: title || null,
      imagePath,
      imageName: file.originalname,
      imageType: file.mimetype,
      sortOrder: parseInt(sortOrder, 10) || 0,
    }
  );
  return result.recordset[0];
}

async function removeImage(imageId) {
  const result = await query(`SELECT * FROM dbo.GalleryImages WHERE Id = @imageId`, { imageId });
  const image = result.recordset[0];
  if (!image) return null;
  await query(`DELETE FROM dbo.GalleryImages WHERE Id = @imageId`, { imageId });
  safeDeleteFile(image.ImagePath);
  return image;
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  listImages,
  getImageById,
  updateImage,
  addImage,
  removeImage,
};

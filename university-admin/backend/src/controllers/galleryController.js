const galleryService = require('../services/galleryService');
const { createCrudController } = require('./crudFactory');
const { success, fail } = require('../utils/response');

const base = createCrudController(galleryService, {
  resourceName: 'Album',
  supportsFile: true,
});

async function listImages(req, res, next) {
  try {
    const data = await galleryService.listImages(req.query);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}

async function getImage(req, res, next) {
  try {
    const imageId = parseInt(req.params.imageId, 10);
    const item = await galleryService.getImageById(imageId);
    if (!item) return fail(res, 'Image not found', 404);
    return success(res, item);
  } catch (err) {
    return next(err);
  }
}

async function updateImage(req, res, next) {
  try {
    const imageId = parseInt(req.params.imageId, 10);
    const item = await galleryService.updateImage(imageId, req.body, req.file);
    if (!item) return fail(res, 'Image not found', 404);
    return success(res, item, 'Image updated');
  } catch (err) {
    return next(err);
  }
}

async function addImage(req, res, next) {
  try {
    const galleryId = parseInt(req.params.id, 10);
    const item = await galleryService.addImage(
      galleryId,
      req.file,
      req.body.title,
      req.body.sortOrder
    );
    if (!item) return fail(res, 'Album not found', 404);
    return success(res, item, 'Image added', 201);
  } catch (err) {
    return next(err);
  }
}

async function removeImage(req, res, next) {
  try {
    const imageId = parseInt(req.params.imageId, 10);
    const item = await galleryService.removeImage(imageId);
    if (!item) return fail(res, 'Image not found', 404);
    return success(res, item, 'Image deleted');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  ...base,
  listImages,
  getImage,
  updateImage,
  addImage,
  removeImage,
};

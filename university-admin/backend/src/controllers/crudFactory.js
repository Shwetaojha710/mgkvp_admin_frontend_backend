const { success, fail } = require('../utils/response');

/**
 * Builds standard CRUD controllers for a content module.
 * Supports optional multipart file field via options.fileField.
 */
function createCrudController(service, options = {}) {
  const { resourceName = 'Record', supportsFile = false } = options;

  async function list(req, res, next) {
    try {
      const data = await service.list(req.query);
      return success(res, data);
    } catch (err) {
      return next(err);
    }
  }

  async function getById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const item = await service.getById(id);
      if (!item) return fail(res, `${resourceName} not found`, 404);
      return success(res, item);
    } catch (err) {
      return next(err);
    }
  }

  async function create(req, res, next) {
    try {
      const file = supportsFile ? req.file : undefined;
      const item = await service.create(req.body, ...(supportsFile ? [file, req.user.id] : [req.user.id]));
      return success(res, item, `${resourceName} created`, 201);
    } catch (err) {
      return next(err);
    }
  }

  async function update(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const file = supportsFile ? req.file : undefined;
      const item = supportsFile
        ? await service.update(id, req.body, file, req.user.id)
        : await service.update(id, req.body, req.user.id);
      if (!item) return fail(res, `${resourceName} not found`, 404);
      return success(res, item, `${resourceName} updated`);
    } catch (err) {
      return next(err);
    }
  }

  async function remove(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const item = await service.remove(id);
      if (!item) return fail(res, `${resourceName} not found`, 404);
      return success(res, item, `${resourceName} deleted`);
    } catch (err) {
      return next(err);
    }
  }

  return { list, getById, create, update, remove };
}

module.exports = { createCrudController };

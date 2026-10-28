const cmsService = require('../services/cmsService');
const { success, fail } = require('../utils/response');

function moduleKeyFromReq(req) {
  return String(req.params.moduleKey || '').trim().toLowerCase();
}

async function list(req, res, next) {
  try {
    const moduleKey = moduleKeyFromReq(req);
    if (!moduleKey) return fail(res, 'Module key is required', 400);
    const data = await cmsService.list(moduleKey, req.query);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const moduleKey = moduleKeyFromReq(req);
    const id = parseInt(req.params.id, 10);
    const item = await cmsService.getById(moduleKey, id);
    if (!item) return fail(res, 'Record not found', 404);
    return success(res, item);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const moduleKey = moduleKeyFromReq(req);
    if (!req.body.title) return fail(res, 'Title is required', 400);
    const item = await cmsService.create(moduleKey, req.body, req.files || {}, req.user.id);
    return success(res, item, 'Record created', 201);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const moduleKey = moduleKeyFromReq(req);
    const id = parseInt(req.params.id, 10);
    if (!req.body.title) return fail(res, 'Title is required', 400);
    const item = await cmsService.update(moduleKey, id, req.body, req.files || {}, req.user.id);
    if (!item) return fail(res, 'Record not found', 404);
    return success(res, item, 'Record updated');
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const moduleKey = moduleKeyFromReq(req);
    const id = parseInt(req.params.id, 10);
    const item = await cmsService.remove(moduleKey, id);
    if (!item) return fail(res, 'Record not found', 404);
    return success(res, item, 'Record deleted');
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, getById, create, update, remove };

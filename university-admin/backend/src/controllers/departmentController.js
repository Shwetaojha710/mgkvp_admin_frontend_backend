const departmentService = require('../services/departmentService');
const { createCrudController } = require('./crudFactory');
const { success } = require('../utils/response');

const base = createCrudController(departmentService, { resourceName: 'Department' });

async function options(req, res, next) {
  try {
    const items = await departmentService.listAllActive();
    return success(res, items);
  } catch (err) {
    return next(err);
  }
}

module.exports = { ...base, options };

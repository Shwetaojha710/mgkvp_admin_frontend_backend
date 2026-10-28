const facultyService = require('../services/facultyService');
const { createCrudController } = require('./crudFactory');

module.exports = createCrudController(facultyService, {
  resourceName: 'Faculty',
  supportsFile: true,
});

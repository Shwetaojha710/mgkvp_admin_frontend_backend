const pageService = require('../services/pageService');
const { createCrudController } = require('./crudFactory');

module.exports = createCrudController(pageService, {
  resourceName: 'Page',
  supportsFile: false,
});

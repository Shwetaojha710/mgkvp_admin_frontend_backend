const bannerService = require('../services/bannerService');
const { createCrudController } = require('./crudFactory');

module.exports = createCrudController(bannerService, {
  resourceName: 'Banner',
  supportsFile: true,
});

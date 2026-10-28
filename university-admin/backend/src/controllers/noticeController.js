const noticeService = require('../services/noticeService');
const { createCrudController } = require('./crudFactory');

module.exports = createCrudController(noticeService, {
  resourceName: 'Notice',
  supportsFile: true,
});

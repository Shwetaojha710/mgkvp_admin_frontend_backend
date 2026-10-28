const documentService = require('../services/documentService');
const { createCrudController } = require('./crudFactory');

module.exports = createCrudController(documentService, {
  resourceName: 'Document',
  supportsFile: true,
});

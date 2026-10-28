const newsEventService = require('../services/newsEventService');
const { createCrudController } = require('./crudFactory');

module.exports = createCrudController(newsEventService, {
  resourceName: 'News/Event',
  supportsFile: true,
});

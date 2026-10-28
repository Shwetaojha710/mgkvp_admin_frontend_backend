const express = require('express');
const controller = require('../controllers/cmsController');
const { authenticate, authorizeStaff } = require('../middleware/auth');
const { createUploader } = require('../middleware/upload');

const router = express.Router();
const upload = createUploader('cms');

router.use(authenticate, authorizeStaff);

router.get('/:moduleKey', controller.list);
router.get('/:moduleKey/:id', controller.getById);
router.post(
  '/:moduleKey',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ]),
  controller.create
);
router.put(
  '/:moduleKey/:id',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ]),
  controller.update
);
router.delete('/:moduleKey/:id', controller.remove);

module.exports = router;

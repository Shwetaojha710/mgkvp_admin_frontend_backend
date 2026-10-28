const express = require('express');
const controller = require('../controllers/newsEventController');
const { authenticate, authorizeStaff } = require('../middleware/auth');
const { createUploader } = require('../middleware/upload');

const router = express.Router();
const upload = createUploader('news');

router.use(authenticate, authorizeStaff);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', upload.single('file'), controller.create);
router.put('/:id', upload.single('file'), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;

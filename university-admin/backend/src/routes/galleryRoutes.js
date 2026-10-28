const express = require('express');
const controller = require('../controllers/galleryController');
const { authenticate, authorizeStaff } = require('../middleware/auth');
const { createUploader } = require('../middleware/upload');

const router = express.Router();
const upload = createUploader('galleries');

router.use(authenticate, authorizeStaff);

// Album CRUD (dbo.Galleries)
router.get('/', controller.list);
router.post('/', upload.single('file'), controller.create);

// Gallery images flat list (must be before /:id)
router.get('/images', controller.listImages);
router.get('/images/:imageId', controller.getImage);
router.put('/images/:imageId', upload.single('file'), controller.updateImage);
router.delete('/images/:imageId', controller.removeImage);

router.get('/:id', controller.getById);
router.put('/:id', upload.single('file'), controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/images', upload.single('file'), controller.addImage);

module.exports = router;

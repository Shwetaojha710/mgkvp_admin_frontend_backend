const express = require('express');
const controller = require('../controllers/departmentController');
const { authenticate, authorizeStaff } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorizeStaff);

router.get('/options', controller.options);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;

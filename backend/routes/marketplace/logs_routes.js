const express = require('express');
const controller = require('../../controllers/marketplace/logs_controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/:type', controller.list);
router.get('/', controller.list);

module.exports = router;

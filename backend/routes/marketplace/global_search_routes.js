const express = require('express');
const controller = require('../../controllers/marketplace/global_search_controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/', controller.search);

module.exports = router;

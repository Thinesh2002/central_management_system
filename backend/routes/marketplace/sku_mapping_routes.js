const express = require('express');
const controller = require('../../controllers/marketplace/sku_mapping_controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/suggestions/local-skus', controller.suggestions);
router.get('/unmapped', controller.unmapped);
router.post('/duplicate-check', controller.duplicateCheck);
router.post('/bulk', controller.bulk);
router.get('/', controller.list);
router.post('/', controller.save);
router.put('/:id', controller.save);
router.delete('/:id', controller.remove);
module.exports = router;

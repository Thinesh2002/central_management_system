const express = require('express');
const controller = require('../../controllers/woo/woo_order_controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/orders', controller.list);
router.post('/orders/sync', controller.sync);
router.get('/orders/:id', controller.detail);
router.put('/orders/:id/status', controller.updateStatus);
router.get('/finance/summary', controller.financeSummary);
module.exports = router;

const express = require('express');
const controller = require('../../controllers/inventory/inventory_controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.get('/dashboard', controller.dashboard);
router.get('/stock-ledger', controller.stockLedger);
router.get('/order-stock-deductions', controller.orderStockDeductions);
router.get('/stock-push-queue', controller.stockPushQueue);
router.post('/stock-adjustment', controller.stockAdjustment);
router.get('/low-stock', controller.lowStock);
router.get('/out-of-stock', controller.outOfStock);

module.exports = router;

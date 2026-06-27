const express = require('express');
const controller = require('../../controllers/erp/erp_controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/business-dashboard', controller.businessDashboard);

router.get('/price-dashboard', controller.priceDashboard);
router.post('/price-dashboard/recalculate', controller.recalculatePrices);

router.get('/image-dashboard', controller.imageDashboard);
router.post('/image-dashboard/audit', controller.runImageAudit);
router.patch('/image-dashboard/:id/url', controller.updateImageUrl);
router.post('/image-dashboard/:id/set-main', controller.setMainImage);
router.post('/image-dashboard/push-image', controller.pushImage);

router.get('/products/metrics', controller.productMetrics);

router.get('/reports/sku-economics/:sku', controller.skuEconomics);
router.get('/reports/demand-analysis', controller.demandAnalysis);

router.get('/inventory/sku-search/:sku', controller.skuSearch);
router.get('/inventory/sku-search', controller.skuSearch);
router.get('/inventory/auto-stock-settings', controller.autoStockSettings);
router.put('/inventory/auto-stock-settings', controller.saveAutoStockSettings);
router.post('/inventory/manual-stock-update', controller.manualStockUpdate);
router.post('/inventory/push-stock', controller.pushStock);

router.post('/marketplace/transfer', controller.createTransferJob);

module.exports = router;

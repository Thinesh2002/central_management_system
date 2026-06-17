const express = require("express");
const router = express.Router();
const controller = require("../../../controllers/daraz/advanced/daraz_advanced_controller");

router.get("/dashboard", controller.dashboard);
router.get("/products", controller.products);
router.get("/inventory", controller.inventory);
router.put("/inventory/stock", controller.updateStock);
router.post("/inventory/stock", controller.updateStock);
router.post("/inventory/sync-queued", controller.syncQueuedStock);

router.get("/sku-mapping", controller.skuMappings);
router.post("/sku-mapping", controller.saveSkuMapping);
router.delete("/sku-mapping", controller.deleteSkuMapping);

router.get("/category-mapping", controller.categoryMappings);
router.post("/category-mapping", controller.saveCategoryMapping);

router.get("/pack-rules", controller.packRules);
router.post("/pack-rules", controller.savePackRule);

router.get("/images", controller.images);
router.get("/net-sales", controller.netSales);
router.get("/sync-logs", controller.syncLogs);
router.get("/business-reports", controller.businessReports);
router.post("/sync-products", controller.syncAllProducts);
router.post("/sync-products/:account_code", controller.syncAllProducts);

module.exports = router;

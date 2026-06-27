const express = require("express");
const darazProductSyncController = require("../../../controllers/daraz/product_management/daraz_product_sync_controller");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/categories/:accountId", darazProductSyncController.getCategoryTree);
router.get("/category-attributes/:accountId", darazProductSyncController.getCategoryAttributes);
router.get("/category-attributes/:accountId/:categoryId", darazProductSyncController.getCategoryAttributes);
router.post("/create/:accountId", darazProductSyncController.createDarazProduct);
router.post("/update/:accountId", darazProductSyncController.updateDarazProduct);
router.put("/update/:accountId", darazProductSyncController.updateDarazProduct);
router.post("/transfer-local/:productId", darazProductSyncController.transferLocalToDaraz);
router.post("/sync/:accountId", darazProductSyncController.manualSync);
router.get("/preview", darazProductSyncController.previewProducts);
router.get("/runs", darazProductSyncController.syncRuns);
router.get("/stats", darazProductSyncController.productStats);
router.get("/view/:id", darazProductSyncController.viewProduct);
router.get("/item/:accountId/:itemId", darazProductSyncController.viewProductByItemId);
router.get("/raw/:id", darazProductSyncController.productRawJson);
router.patch("/status/:id", darazProductSyncController.updateSyncStatus);
router.patch("/local-link/:id", darazProductSyncController.updateLocalLink);
router.delete("/delete/:id", darazProductSyncController.deletePreviewProduct);
router.delete("/bulk-delete", darazProductSyncController.bulkDeleteByAccount);

module.exports = router;

const express = require("express");
const router = express.Router();

const darazProductSyncController = require("../../../controllers/daraz/product_management/daraz_product_sync_controller");

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
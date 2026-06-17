const express = require("express");
const router = express.Router();

const controller = require("../../controllers/daraz/daraz_products/sync/daraz_products_sync_controller");
const transferController = require("../../controllers/daraz/transfer/woo_to_daraz_transfer_controller");

router.post("/sync", controller.syncAllDarazProducts);
router.post("/sync/:account_code", controller.syncSingleDarazAccountProducts);

router.get("/dashboard/summary", controller.getDashboardSummary);
router.get("/products", controller.getSyncedProducts);
router.get("/products/item/:account_code/:item_id", controller.getProductByItemId);
router.get("/products/:product_id/skus", controller.getProductSkus);
router.get("/products/:product_id", controller.getSyncedProductDetails);

router.post("/transfer-listings", transferController.transferListings);

module.exports = router;

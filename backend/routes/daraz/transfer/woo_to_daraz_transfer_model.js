const express = require("express");
const router = express.Router();

const darazProductController = require("../../controllers/daraz/daraz_products/sync/daraz_products_sync_controller");
const controller = require("../../controllers/daraz/daraz_products/daraz_products controller");
const transferController = require("../../controllers/daraz/transfer/woo_to_daraz_transfer_controller");

router.get("/sync", darazProductController.syncProducts);
router.get("/products", controller.getAllProducts);
router.get("/product/:id", controller.getSingleProduct);
router.post("/transfer-listings", transferController.transferListings);

module.exports = router;
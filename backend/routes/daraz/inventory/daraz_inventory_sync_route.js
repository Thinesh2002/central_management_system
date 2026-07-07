const express = require("express");
const controller = require("../../../controllers/daraz/inventory/daraz_inventory_sync_controller");

const router = express.Router();

router.post("/sync-all", controller.syncAll);
router.post("/sync-sku/:sku", controller.syncSku);

module.exports = router;

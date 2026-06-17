const express = require("express");
const router = express.Router();
const controller = require("../../controllers/daraz/daraz_inventory/daraz_inventory_controller");

router.get("/inventory/health", controller.getInventoryHealth);
router.get("/inventory/mismatches", controller.getInventoryHealth);
router.get("/inventory/oos", controller.getOosSkus);
router.get("/inventory/stock-queue", controller.getStockQueue);
router.post("/inventory/stock-queue", controller.addStockUpdateQueue);
router.post("/inventory/sync-local", controller.queueLocalInventorySync);
router.get("/inventory/history", controller.getInventoryHistory);

module.exports = router;

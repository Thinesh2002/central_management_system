const express = require("express");
const router = express.Router();
const controller = require("../../controllers/daraz/daraz_inventory/daraz_inventory_controller");

router.get("/inventory/oos", controller.getOosSkus);
router.get("/inventory/stock-queue", controller.getStockQueue);
router.post("/inventory/stock-queue", controller.addStockUpdateQueue);

module.exports = router;

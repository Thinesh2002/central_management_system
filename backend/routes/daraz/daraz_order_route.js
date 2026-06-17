const express = require("express");
const router = express.Router();
const controller = require("../../controllers/daraz/daraz_orders/daraz_order_sync_controller");

router.post("/orders/sync", controller.syncAllDarazOrders);
router.post("/orders/sync/:account_code", controller.syncSingleDarazAccountOrders);
router.get("/orders", controller.getOrders);
router.get("/orders/:order_id", controller.getOrderDetails);

module.exports = router;

const express = require("express");
const controller = require("../../../controllers/daraz/daraz_orders/daraz_order_controller");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/health", controller.health);
router.get("/logs/api", controller.getApiLogs);
router.get("/logs/sync", controller.getSyncLogs);
router.get("/", controller.getOrders);
router.post("/sync", controller.syncOrders);
router.post("/bulk/status", controller.bulkStatus);
router.post("/bulk/awb", controller.bulkAwb);
router.get("/:id", controller.getOrderDetail);
router.post("/:id/status", controller.changeStatus);
router.post("/:id/awb", controller.generateAwb);
router.post("/:id/tracking/sync", controller.syncTracking);

module.exports = router;

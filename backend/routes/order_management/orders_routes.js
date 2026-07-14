const express = require("express");
const controller = require("../../controllers/order_management/order_controller");

const router = express.Router();

router.get("/", controller.listOrders);
router.get("/filter-options", controller.filterOptions);
router.get("/next-number", controller.previewOrderNumber);
router.post("/", controller.createManualOrder);
router.get("/:source/:id", controller.getOrder);
router.delete("/:source/:id", controller.deleteOrder);
router.patch("/:source/:id/status", controller.updateStatus);
router.post("/:source/:id/waybill", controller.createWaybill);
router.get("/:source/:id/tracking", controller.getTracking);
router.get("/:source/:id/finance", controller.getFinance);
router.get("/:source/:id/messages", controller.listOrderMessages);
router.post("/:source/:id/messages", controller.sendOrderMessage);

module.exports = router;

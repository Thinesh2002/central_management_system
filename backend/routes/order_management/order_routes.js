const express = require("express");
const orderController = require("../../controllers/order_management/order_controller");
const { protect } = require("../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/summary", orderController.getOrderSummary);
router.get("/", orderController.getOrders);
router.post("/", orderController.createOrder);
router.get("/:orderId", orderController.getOrderById);
router.put("/:orderId", orderController.updateOrder);
router.patch("/:orderId/status", orderController.updateOrderStatus);
router.delete("/:orderId", orderController.deleteOrder);
router.patch("/:orderId/restore", orderController.restoreOrder);
router.get("/:orderId/items", orderController.getOrderItems);
router.post("/:orderId/items", orderController.addOrderItem);
router.put("/items/:itemId", orderController.updateOrderItem);
router.delete("/items/:itemId", orderController.deleteOrderItem);
router.patch("/items/:itemId/restore", orderController.restoreOrderItem);
router.get("/:orderId/logs", orderController.getOrderLogs);

module.exports = router;

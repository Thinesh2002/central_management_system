const express = require("express");
const orderController = require("../../controllers/order_management/order_controller");

const router = express.Router();

// Dashboard / summary
router.get("/summary", orderController.getOrderSummary);

// Orders
router.get("/", orderController.getOrders);
router.post("/", orderController.createOrder);
router.get("/:orderId", orderController.getOrderById);
router.put("/:orderId", orderController.updateOrder);
router.patch("/:orderId/status", orderController.updateOrderStatus);
router.delete("/:orderId", orderController.deleteOrder);
router.patch("/:orderId/restore", orderController.restoreOrder);

// Order items
router.get("/:orderId/items", orderController.getOrderItems);
router.post("/:orderId/items", orderController.addOrderItem);
router.put("/items/:itemId", orderController.updateOrderItem);
router.delete("/items/:itemId", orderController.deleteOrderItem);
router.patch("/items/:itemId/restore", orderController.restoreOrderItem);

// Logs
router.get("/:orderId/logs", orderController.getOrderLogs);

module.exports = router;

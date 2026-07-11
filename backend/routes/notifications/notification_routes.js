const express = require("express");
const router = express.Router();

const notificationController = require("../../controllers/notifications/notification_controller");
const { protect } = require("../../middleware/auth");

router.get("/", protect, notificationController.listNotifications);
router.post("/:id/read", protect, notificationController.markRead);
router.post("/read-all", protect, notificationController.markAllRead);

module.exports = router;

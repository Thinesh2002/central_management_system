const notificationModel = require("../../models/notifications/notification_model");

async function listNotifications(req, res) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      notificationModel.listRecent({ limit: req.query.limit || 30 }),
      notificationModel.getUnreadCount(),
    ]);

    return res.json({ success: true, data: notifications, unread_count: unreadCount });
  } catch (error) {
    console.error("[NOTIFICATIONS_LIST_ERROR]", error);
    return res.status(500).json({ success: false, message: "Failed to load notifications." });
  }
}

async function markRead(req, res) {
  try {
    await notificationModel.markRead(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    console.error("[NOTIFICATIONS_MARK_READ_ERROR]", error);
    return res.status(500).json({ success: false, message: "Failed to mark notification as read." });
  }
}

async function markAllRead(req, res) {
  try {
    await notificationModel.markAllRead();
    return res.json({ success: true });
  } catch (error) {
    console.error("[NOTIFICATIONS_MARK_ALL_READ_ERROR]", error);
    return res.status(500).json({ success: false, message: "Failed to mark notifications as read." });
  }
}

module.exports = { listNotifications, markRead, markAllRead };

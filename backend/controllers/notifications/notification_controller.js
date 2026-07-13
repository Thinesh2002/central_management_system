const notificationModel = require("../../models/notifications/notification_model");

async function listNotifications(req, res) {
  try {
    const filters = {
      limit: req.query.limit || 30,
      page: req.query.page || 1,
      from: req.query.from || null,
      to: req.query.to || null,
      unreadOnly: req.query.unread_only === "1" || req.query.unread_only === "true",
    };

    const [notifications, unreadCount, total] = await Promise.all([
      notificationModel.listRecent(filters),
      notificationModel.getUnreadCount(),
      notificationModel.countAll(filters),
    ]);

    return res.json({
      success: true,
      data: notifications,
      unread_count: unreadCount,
      pagination: {
        page: Number(filters.page),
        limit: Number(filters.limit),
        total,
        total_pages: Math.ceil(total / Number(filters.limit)),
      },
    });
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

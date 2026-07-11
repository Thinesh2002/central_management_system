const db = require("../../config/logs_management_db/logs_management_db");

async function create({ type, severity = "info", title, message = null, link = null }) {
  const [result] = await db.query(
    `INSERT INTO notifications (type, severity, title, message, link)
     VALUES (?, ?, ?, ?, ?)`,
    [type, severity, title, message, link]
  );

  return result.insertId;
}

async function listRecent({ limit = 30, unreadOnly = false } = {}) {
  const whereSql = unreadOnly ? "WHERE is_read = 0" : "";

  const [rows] = await db.query(
    `SELECT * FROM notifications ${whereSql} ORDER BY id DESC LIMIT ?`,
    [Number(limit)]
  );

  return rows;
}

async function getUnreadCount() {
  const [rows] = await db.query(`SELECT COUNT(*) AS count FROM notifications WHERE is_read = 0`);
  return Number(rows[0]?.count || 0);
}

async function markRead(id) {
  await db.query(`UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?`, [id]);
}

async function markAllRead() {
  await db.query(`UPDATE notifications SET is_read = 1, read_at = NOW() WHERE is_read = 0`);
}

// Avoids spamming duplicate notifications when a recurring job (e.g. daily
// low-stock check) has nothing new to say since its last run.
async function existsRecentOfType(type, sinceDate) {
  const [rows] = await db.query(
    `SELECT id FROM notifications WHERE type = ? AND created_at >= ? LIMIT 1`,
    [type, sinceDate]
  );

  return Boolean(rows[0]);
}

module.exports = { create, listRecent, getUnreadCount, markRead, markAllRead, existsRecentOfType };

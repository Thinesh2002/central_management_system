const db = require("../../config/logs_management_db/logs_management_db");

async function create({ type, severity = "info", title, message = null, link = null }) {
  const [result] = await db.query(
    `INSERT INTO notifications (type, severity, title, message, link)
     VALUES (?, ?, ?, ?, ?)`,
    [type, severity, title, message, link]
  );

  return result.insertId;
}

function buildDateFilters({ unreadOnly = false, from = null, to = null } = {}) {
  const where = [];
  const params = [];

  if (unreadOnly) where.push("is_read = 0");
  if (from) {
    where.push("created_at >= ?");
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    where.push("created_at <= ?");
    params.push(`${to} 23:59:59`);
  }

  return { whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

async function listRecent({ limit = 30, page = 1, unreadOnly = false, from = null, to = null } = {}) {
  const { whereSql, params } = buildDateFilters({ unreadOnly, from, to });
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;

  const [rows] = await db.query(
    `SELECT * FROM notifications ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  return rows;
}

async function countAll({ unreadOnly = false, from = null, to = null } = {}) {
  const { whereSql, params } = buildDateFilters({ unreadOnly, from, to });

  const [rows] = await db.query(`SELECT COUNT(*) AS total FROM notifications ${whereSql}`, params);
  return Number(rows[0]?.total || 0);
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

module.exports = {
  create,
  listRecent,
  countAll,
  getUnreadCount,
  markRead,
  markAllRead,
  existsRecentOfType,
};

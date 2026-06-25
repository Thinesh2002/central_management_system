const db = require("../../config/order_management_db/cm_order_management");

function jsonValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  return JSON.stringify(value);
}

async function createLog(payload = {}, connection = db) {
  const sql = `
    INSERT INTO order_logs
      (order_id, table_name, record_id, action, old_data, new_data, changed_by, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    payload.order_id || null,
    payload.table_name,
    payload.record_id || null,
    payload.action,
    jsonValue(payload.old_data),
    jsonValue(payload.new_data),
    payload.changed_by || null,
    payload.reason || null,
  ];

  const [result] = await connection.query(sql, values);
  return result.insertId;
}

async function getLogsByOrderId(orderId, params = {}) {
  const limit = Math.min(Math.max(Number(params.limit || 50), 1), 200);
  const offset = Math.max(Number(params.offset || 0), 0);

  const [rows] = await db.query(
    `
      SELECT *
      FROM order_logs
      WHERE order_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    [orderId, limit, offset]
  );

  return rows;
}

module.exports = {
  createLog,
  getLogsByOrderId,
};

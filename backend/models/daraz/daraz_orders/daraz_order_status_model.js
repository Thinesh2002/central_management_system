const db = require('../../../config/order_management_db/cm_order_management');
const { jsonValue } = require('../../../utils/business/query_helpers');

async function getOrder(orderId) {
  const [rows] = await db.query(
    `SELECT * FROM daraz_orders WHERE id = ? OR order_id = ? OR order_number = ? LIMIT 1`,
    [orderId, orderId, orderId]
  );
  return rows[0] || null;
}

async function getOrderItems(order) {
  if (!order) return [];
  const [rows] = await db.query(
    `SELECT * FROM daraz_order_items WHERE order_id = ? OR daraz_order_id = ? ORDER BY id ASC`,
    [order.id, order.order_id]
  );
  return rows;
}

async function insertLog(data = {}) {
  const [result] = await db.query(
    `INSERT INTO daraz_order_status_logs
      (account_id, order_id, order_item_ids, action, old_status, new_status, api_response, success, error_message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.account_id || null,
      data.order_id || null,
      jsonValue(data.order_item_ids || []),
      data.action || null,
      data.old_status || null,
      data.new_status || null,
      jsonValue(data.api_response || null),
      data.success ? 1 : 0,
      data.error_message || null,
    ]
  );
  return result.insertId;
}

async function updateLocalStatus(order, darazStatus, localStatus) {
  await db.query(
    `UPDATE daraz_orders
     SET daraz_status = COALESCE(?, daraz_status), local_status = COALESCE(?, local_status), updated_at = NOW()
     WHERE id = ?`,
    [darazStatus || null, localStatus || null, order.id]
  );
}

module.exports = { getOrder, getOrderItems, insertLog, updateLocalStatus };

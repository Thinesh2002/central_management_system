const db = require("../../config/logs_management_db/logs_management_db");

async function create({
  source = "daraz",
  source_order_id: sourceOrderId = null,
  order_item_id: orderItemId = null,
  sku = null,
  qty = null,
  old_stock_qty: oldStockQty = null,
  new_stock_qty: newStockQty = null,
  status = "success",
  message = null,
}) {
  await db.query(
    `INSERT INTO inventory_logs
       (source, source_order_id, order_item_id, sku, qty, old_stock_qty, new_stock_qty, status, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [source, sourceOrderId, orderItemId, sku, qty, oldStockQty, newStockQty, status, message]
  );
}

// Used when an order item transitions to "canceled" - only restock if a
// deduction genuinely succeeded for this exact item before (never for
// sku_missing/error attempts, and never twice for the same item).
async function findLatestDeduction(source, orderItemId) {
  if (!orderItemId) return null;

  const [rows] = await db.query(
    `SELECT * FROM inventory_logs
     WHERE source = ? AND order_item_id = ? AND status = 'success'
     ORDER BY id DESC LIMIT 1`,
    [source, orderItemId]
  );

  return rows[0] || null;
}

async function listRecent({ status, sku, limit = 200 } = {}) {
  const params = [];
  let whereSql = "WHERE 1=1";

  if (status) {
    whereSql += " AND status = ?";
    params.push(status);
  }

  if (sku) {
    whereSql += " AND sku = ?";
    params.push(sku);
  }

  const [rows] = await db.query(
    `SELECT * FROM inventory_logs ${whereSql} ORDER BY id DESC LIMIT ?`,
    [...params, Number(limit)]
  );

  return rows;
}

module.exports = { create, listRecent, findLatestDeduction };

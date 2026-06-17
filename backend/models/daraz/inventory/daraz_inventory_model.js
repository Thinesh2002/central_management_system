const db = require("../../../config/product_management_db");

const safeJsonStringify = (data, fallback = "{}") => {
  try {
    if (data === undefined || data === null) return fallback;
    return JSON.stringify(data);
  } catch {
    return fallback;
  }
};

exports.getOosSkus = async ({ account_code = null, search = null, limit = 100 } = {}) => {
  const where = ["(COALESCE(s.quantity, 0) <= 0 OR COALESCE(s.available, 0) <= 0 OR COALESCE(s.sellable_stock, 0) <= 0)"];
  const params = [];

  if (account_code) {
    where.push("p.account_code = ?");
    params.push(account_code);
  }

  if (search) {
    where.push("(s.seller_sku LIKE ? OR p.name LIKE ? OR CAST(p.item_id AS CHAR) LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  params.push(Math.min(Number(limit) || 100, 500));

  const [rows] = await db.query(
    `
    SELECT p.account_code, p.account_name, p.id AS product_id, p.item_id, p.name AS product_name,
           s.id AS sku_db_id, s.sku_id, s.seller_sku, s.shop_sku, s.sku_status,
           s.price, s.special_price, s.quantity, s.available, s.sellable_stock,
           p.last_synced_at
    FROM daraz_products p
    JOIN daraz_skus s ON s.product_id = p.id
    WHERE ${where.join(" AND ")}
    ORDER BY p.last_synced_at DESC
    LIMIT ?
    `,
    params
  );

  return rows;
};

exports.addStockUpdateQueue = async ({ account_id = null, account_code, item_id, sku_id = null, seller_sku = null, target_quantity = null, target_price = null, target_special_price = null, update_type = "stock", requested_by = null }) => {
  const [result] = await db.query(
    `
    INSERT INTO daraz_stock_update_queue (
      account_id, account_code, item_id, sku_id, seller_sku, target_quantity, target_price,
      target_special_price, update_type, status, requested_by, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
    `,
    [account_id, account_code, item_id, sku_id, seller_sku, target_quantity, target_price, target_special_price, update_type, requested_by]
  );

  return result.insertId;
};

exports.getStockQueue = async ({ status = "pending", limit = 100 } = {}) => {
  const [rows] = await db.query(
    `SELECT * FROM daraz_stock_update_queue WHERE status = ? ORDER BY FIELD(priority, 'critical','high','normal','low'), id ASC LIMIT ?`,
    [status, Math.min(Number(limit) || 100, 500)]
  );
  return rows;
};

exports.markQueueItem = async (id, { status, response = null, error = null }) => {
  await db.query(
    `
    UPDATE daraz_stock_update_queue
    SET status = ?, attempts = attempts + 1, last_attempt_at = NOW(),
        response_json = COALESCE(?, response_json), error_message = ?, updated_at = NOW()
    WHERE id = ?
    `,
    [status, safeJsonStringify(response, null), error?.message || error || null, id]
  );
};

exports.createInventoryHistory = async (payload = {}) => {
  await db.query(
    `
    INSERT INTO daraz_inventory_history (
      account_id, account_code, product_id, sku_db_id, item_id, sku_id, seller_sku,
      old_quantity, new_quantity, old_price, new_price, old_special_price, new_special_price,
      change_type, reason, changed_by, raw_json, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      payload.account_id || null,
      payload.account_code,
      payload.product_id || null,
      payload.sku_db_id || null,
      payload.item_id,
      payload.sku_id || null,
      payload.seller_sku || null,
      payload.old_quantity ?? null,
      payload.new_quantity ?? null,
      payload.old_price ?? null,
      payload.new_price ?? null,
      payload.old_special_price ?? null,
      payload.new_special_price ?? null,
      payload.change_type || "manual_update",
      payload.reason || null,
      payload.changed_by || null,
      safeJsonStringify(payload.raw || payload)
    ]
  );
};

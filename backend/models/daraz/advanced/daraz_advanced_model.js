const db = require("../../../config/product_management_db");
const productSyncModel = require("../products_models/sync/daraz_product_sync_model");

const query = async (sql, params = []) => {
  const [rows] = await db.query(sql, params);
  return rows;
};

const execute = async (sql, params = []) => {
  const [result] = await db.query(sql, params);
  return result;
};

const logAction = async ({ module, action, account_code = null, reference_type = null, reference_id = null, status = "success", message = null, payload = null, error = null, created_by = null }) => {
  try {
    await execute(
      `INSERT INTO daraz_system_action_logs
       (module, action, account_code, reference_type, reference_id, status, message, payload_json, error_json, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [module, action, account_code, reference_type, reference_id, status, message, payload ? JSON.stringify(payload) : null, error ? JSON.stringify(error) : null, created_by]
    );
  } catch (err) {
    console.error("[DARAZ_ACTION_LOG_FAIL]:", err.message);
  }
};

const safeNumber = (value) => Number(value || 0);

exports.getDashboard = async () => {
  const [accountSummary] = await query(`
    SELECT
      COUNT(*) AS total_accounts,
      SUM(CASE WHEN token_status IN ('active','VALID','valid') THEN 1 ELSE 0 END) AS active_tokens,
      SUM(CASE WHEN token_status IN ('refresh_failed','reauth_required','expired','UNKNOWN','missing') OR token_status IS NULL THEN 1 ELSE 0 END) AS needs_attention
    FROM daraz_accounts
  `);

  const [productSummary] = await query(`
    SELECT
      COUNT(*) AS total_products,
      COUNT(DISTINCT account_code) AS product_accounts,
      SUM(CASE WHEN LOWER(COALESCE(status,'')) LIKE '%active%' THEN 1 ELSE 0 END) AS active_products
    FROM daraz_products
  `);

  const [skuSummary] = await query(`
    SELECT
      COUNT(*) AS total_skus,
      SUM(CASE WHEN COALESCE(quantity,0) <= 0 OR COALESCE(available,0) <= 0 OR COALESCE(sellable_stock,0) <= 0 THEN 1 ELSE 0 END) AS oos_skus,
      SUM(CASE WHEN system_sku IS NULL AND seller_sku IS NOT NULL THEN 1 ELSE 0 END) AS unmapped_skus
    FROM daraz_skus
  `);

  const [orderSummary] = await query(`
    SELECT
      COUNT(*) AS total_orders,
      SUM(COALESCE(order_total,0)) AS gross_sales,
      SUM(COALESCE(commission_amount,0)) AS commissions,
      SUM(COALESCE(shipping_fee,0)) AS shipping_fees
    FROM daraz_orders
  `).catch(() => [{ total_orders: 0, gross_sales: 0, commissions: 0, shipping_fees: 0 }]);

  const latestLogs = await query(`
    SELECT id, module, sync_type, account_code, status, total_products, synced_products, total_orders, synced_orders, failed_records, message, started_at, finished_at, created_at
    FROM daraz_sync_logs
    ORDER BY COALESCE(started_at, created_at) DESC
    LIMIT 10
  `).catch(() => []);

  return {
    accounts: accountSummary || {},
    products: productSummary || {},
    skus: skuSummary || {},
    orders: orderSummary || {},
    latest_logs: latestLogs
  };
};

exports.getDarazProductsAdvanced = async ({ account_code, search = "", status = "", date_from = null, date_to = null, page = 1, limit = 50 }) => {
  const offset = (Number(page) - 1) * Number(limit);
  const where = [];
  const params = [];

  if (account_code) { where.push("p.account_code = ?"); params.push(account_code); }
  if (status) { where.push("p.status = ?"); params.push(status); }
  if (search) {
    where.push("(p.name LIKE ? OR p.item_id LIKE ? OR s.seller_sku LIKE ? OR s.shop_sku LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (date_from) { where.push("DATE(COALESCE(p.daraz_created_time, p.created_at)) >= ?"); params.push(date_from); }
  if (date_to) { where.push("DATE(COALESCE(p.daraz_created_time, p.created_at)) <= ?"); params.push(date_to); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countRows = await query(`
    SELECT COUNT(DISTINCT p.id) AS total
    FROM daraz_products p
    LEFT JOIN daraz_skus s ON s.product_id = p.id
    ${whereSql}
  `, params);

  const rows = await query(`
    SELECT
      p.id, p.account_code, p.account_name, p.item_id, p.name, p.brand, p.status,
      p.primary_category, p.primary_category_name, p.product_url, p.images_json,
      p.buy_price, p.cost_price, p.daraz_created_time, p.daraz_updated_time, p.last_synced_at,
      COUNT(s.id) AS sku_count,
      SUM(COALESCE(s.quantity,0)) AS total_quantity,
      SUM(COALESCE(s.available,0)) AS total_available,
      SUM(CASE WHEN COALESCE(s.quantity,0) <= 0 THEN 1 ELSE 0 END) AS oos_sku_count,
      MIN(s.price) AS min_price,
      MAX(s.price) AS max_price
    FROM daraz_products p
    LEFT JOIN daraz_skus s ON s.product_id = p.id
    ${whereSql}
    GROUP BY p.id
    ORDER BY COALESCE(p.daraz_updated_time, p.last_synced_at, p.created_at) DESC
    LIMIT ? OFFSET ?
  `, [...params, Number(limit), offset]);

  return { rows, total: countRows[0]?.total || 0, page: Number(page), limit: Number(limit) };
};

exports.getManageInventory = async ({ account_code, search = "", mismatch = "", page = 1, limit = 50 }) => {
  const offset = (Number(page) - 1) * Number(limit);
  const where = [];
  const params = [];
  if (account_code) { where.push("s.account_code = ?"); params.push(account_code); }
  if (search) {
    where.push("(s.seller_sku LIKE ? OR s.shop_sku LIKE ? OR p.name LIKE ? OR m.system_sku LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (mismatch === "missing_system_sku") where.push("m.system_sku IS NULL");
  if (mismatch === "stock_mismatch") where.push("COALESCE(i.available_stock,0) <> COALESCE(s.quantity,0)");
  if (mismatch === "price_missing") where.push("(pc.buy_price IS NULL OR pc.buy_price = 0)");

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRows = await query(`
    SELECT COUNT(*) AS total
    FROM daraz_skus s
    LEFT JOIN daraz_products p ON p.id = s.product_id
    LEFT JOIN daraz_sku_mapping m ON m.account_code = s.account_code AND m.daraz_seller_sku = s.seller_sku
    LEFT JOIN inventory i ON i.sku = COALESCE(m.system_sku, m.correct_sku, s.system_sku, s.seller_sku)
    LEFT JOIN daraz_product_costs pc ON pc.sku = COALESCE(m.system_sku, m.correct_sku, s.system_sku, s.seller_sku)
    ${whereSql}
  `, params);

  const rows = await query(`
    SELECT
      s.id AS sku_db_id, s.product_id, s.account_code, s.item_id, s.sku_id, s.seller_sku, s.shop_sku,
      s.sku_status, s.price, s.special_price, s.quantity AS daraz_stock, s.available, s.sellable_stock,
      s.sku_images_json, s.url, s.last_synced_at, p.name AS product_name, p.images_json,
      COALESCE(m.system_sku, m.correct_sku, s.system_sku) AS system_sku,
      i.total_stock AS local_total_stock,
      i.available_stock AS local_available_stock,
      pc.buy_price,
      CASE
        WHEN COALESCE(m.system_sku, m.correct_sku, s.system_sku) IS NULL THEN 'sku_not_mapped'
        WHEN i.sku IS NULL THEN 'sku_not_in_inventory'
        WHEN COALESCE(i.available_stock,0) <> COALESCE(s.quantity,0) THEN 'stock_mismatch'
        WHEN pc.buy_price IS NULL OR pc.buy_price = 0 THEN 'cost_missing'
        ELSE 'healthy'
      END AS health_status
    FROM daraz_skus s
    LEFT JOIN daraz_products p ON p.id = s.product_id
    LEFT JOIN daraz_sku_mapping m ON m.account_code = s.account_code AND m.daraz_seller_sku = s.seller_sku
    LEFT JOIN inventory i ON i.sku = COALESCE(m.system_sku, m.correct_sku, s.system_sku, s.seller_sku)
    LEFT JOIN daraz_product_costs pc ON pc.sku = COALESCE(m.system_sku, m.correct_sku, s.system_sku, s.seller_sku)
    ${whereSql}
    ORDER BY health_status DESC, s.updated_at DESC
    LIMIT ? OFFSET ?
  `, [...params, Number(limit), offset]);

  return { rows, total: countRows[0]?.total || 0, page: Number(page), limit: Number(limit) };
};

exports.saveSkuMapping = async ({ account_code, daraz_seller_sku, system_sku, daraz_item_id = null, daraz_sku_id = null, product_id = null, notes = null, created_by = null }) => {
  if (!account_code || !daraz_seller_sku || !system_sku) {
    const err = new Error("Account code, Daraz SKU and System SKU are required.");
    err.statusCode = 400;
    throw err;
  }
  const result = await execute(`
    INSERT INTO daraz_sku_mapping
      (account_code, daraz_item_id, daraz_sku_id, daraz_seller_sku, system_sku, correct_sku, product_id, mapping_status, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    ON DUPLICATE KEY UPDATE
      system_sku = VALUES(system_sku), correct_sku = VALUES(correct_sku), product_id = VALUES(product_id),
      daraz_item_id = VALUES(daraz_item_id), daraz_sku_id = VALUES(daraz_sku_id), notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP
  `, [account_code, daraz_item_id, daraz_sku_id, daraz_seller_sku, system_sku, system_sku, product_id, notes, created_by]);
  await execute(`UPDATE daraz_skus SET system_sku = ? WHERE account_code = ? AND seller_sku = ?`, [system_sku, account_code, daraz_seller_sku]).catch(() => null);
  await logAction({ module: "sku_mapping", action: "save", account_code, reference_type: "daraz_seller_sku", reference_id: daraz_seller_sku, message: `Mapped ${daraz_seller_sku} to ${system_sku}`, payload: { system_sku }, created_by });
  return result;
};

exports.getSkuMappings = async ({ account_code, search = "" }) => {
  const where = [];
  const params = [];
  if (account_code) { where.push("account_code = ?"); params.push(account_code); }
  if (search) { where.push("(daraz_seller_sku LIKE ? OR system_sku LIKE ? OR correct_sku LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return query(`SELECT * FROM daraz_sku_mapping ${whereSql} ORDER BY updated_at DESC`, params);
};

exports.deleteSkuMapping = async ({ account_code, daraz_seller_sku }) => {
  await execute(`DELETE FROM daraz_sku_mapping WHERE account_code = ? AND daraz_seller_sku = ?`, [account_code, daraz_seller_sku]);
  await logAction({ module: "sku_mapping", action: "delete", account_code, reference_type: "daraz_seller_sku", reference_id: daraz_seller_sku, message: "SKU mapping removed" });
};

exports.updateDarazStock = async ({ account_code, item_id, sku_id, seller_sku, new_stock, requested_by = null }) => {
  const oldRows = await query(`SELECT quantity FROM daraz_skus WHERE account_code = ? AND seller_sku = ? LIMIT 1`, [account_code, seller_sku]);
  const oldStock = oldRows[0]?.quantity ?? null;

  await execute(`UPDATE daraz_skus SET quantity = ?, available = ?, sellable_stock = ?, last_stock_update_at = NOW(), stock_sync_status = 'queued_for_daraz' WHERE account_code = ? AND seller_sku = ?`, [Number(new_stock), Number(new_stock), Number(new_stock), account_code, seller_sku]);

  await execute(`
    INSERT INTO daraz_stock_update_logs
    (account_code, item_id, sku_id, seller_sku, old_daraz_stock, new_daraz_stock, status, requested_by)
    VALUES (?, ?, ?, ?, ?, ?, 'queued', ?)
  `, [account_code, item_id, sku_id, seller_sku, oldStock, Number(new_stock), requested_by]);

  await execute(`
    INSERT INTO daraz_stock_update_queue
    (account_code, item_id, sku_id, seller_sku, target_quantity, update_type, status, requested_by)
    VALUES (?, ?, ?, ?, ?, 'stock', 'pending', ?)
  `, [account_code, item_id, sku_id, seller_sku, Number(new_stock), requested_by]).catch(() => null);

  await logAction({ module: "inventory", action: "daraz_stock_queue", account_code, reference_type: "seller_sku", reference_id: seller_sku, message: `Stock changed locally from ${oldStock ?? '-'} to ${new_stock}; queued for Daraz update.`, payload: { oldStock, new_stock }, created_by: requested_by });

  return { old_stock: oldStock, new_stock: Number(new_stock), queued: true };
};

exports.getCategoryMappings = async ({ account_code }) => {
  const params = [];
  let where = "";
  if (account_code) { where = "WHERE account_code = ? OR account_code IS NULL"; params.push(account_code); }
  return query(`SELECT * FROM daraz_category_mapping ${where} ORDER BY updated_at DESC`, params);
};

exports.saveCategoryMapping = async (data) => {
  const result = await execute(`
    INSERT INTO daraz_category_mapping
      (account_code, local_category_code, local_category_name, local_sub_category_code, local_sub_category_name, daraz_category_id, daraz_category_name, required_attributes_completed, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      daraz_category_name = VALUES(daraz_category_name), required_attributes_completed = VALUES(required_attributes_completed), status = VALUES(status), notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP
  `, [data.account_code || null, data.local_category_code || null, data.local_category_name || null, data.local_sub_category_code || null, data.local_sub_category_name || null, data.daraz_category_id, data.daraz_category_name || null, data.required_attributes_completed ? 1 : 0, data.status || "active", data.notes || null]);
  await logAction({ module: "category_mapping", action: "save", account_code: data.account_code || null, reference_type: "daraz_category_id", reference_id: String(data.daraz_category_id), message: "Category mapping saved", payload: data });
  return result;
};

exports.getPackRules = async () => query(`SELECT * FROM daraz_pack_rules ORDER BY pack_size ASC`);

exports.savePackRule = async ({ pack_size, pack_code, pack_label, sku_suffix, multiplier = null }) => {
  if (!pack_size || !pack_code) {
    const err = new Error("Pack size and pack code are required.");
    err.statusCode = 400;
    throw err;
  }
  const result = await execute(`
    INSERT INTO daraz_pack_rules (pack_size, pack_code, pack_label, sku_suffix, multiplier)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE pack_code = VALUES(pack_code), pack_label = VALUES(pack_label), sku_suffix = VALUES(sku_suffix), multiplier = VALUES(multiplier), updated_at = CURRENT_TIMESTAMP
  `, [Number(pack_size), pack_code, pack_label || `${pack_size} Pack`, sku_suffix || pack_code, multiplier || Number(pack_size)]);
  await logAction({ module: "pack_rules", action: "save", reference_type: "pack_size", reference_id: String(pack_size), message: `Pack rule ${pack_code} saved.` });
  return result;
};

exports.getImages = async ({ account_code, search = "", page = 1, limit = 60 }) => {
  const products = await exports.getDarazProductsAdvanced({ account_code, search, page, limit });
  const rows = [];
  for (const product of products.rows) {
    const raw = product.images_json;
    let parsed = [];
    try { parsed = raw ? JSON.parse(raw) : []; } catch { parsed = []; }
    if (!Array.isArray(parsed)) parsed = [parsed];
    parsed.forEach((img, index) => {
      const url = typeof img === "string" ? img : (img?.url || img?.image_url || img?.daraz_image_url || img?.Url);
      if (url) rows.push({ account_code: product.account_code, item_id: product.item_id, product_name: product.name, image_url: url, sort_order: index + 1 });
    });
  }
  return { rows, total: rows.length, page: Number(page), limit: Number(limit) };
};

exports.getNetSales = async ({ account_code, date_from = null, date_to = null }) => {
  const where = [];
  const params = [];
  if (account_code) { where.push("o.account_code = ?"); params.push(account_code); }
  if (date_from) { where.push("DATE(o.daraz_created_at) >= ?"); params.push(date_from); }
  if (date_to) { where.push("DATE(o.daraz_created_at) <= ?"); params.push(date_to); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await query(`
    SELECT
      DATE_FORMAT(o.daraz_created_at, '%Y-%m') AS month_key,
      o.account_code,
      COUNT(DISTINCT o.order_id) AS orders,
      SUM(COALESCE(oi.quantity,1)) AS units,
      SUM(COALESCE(oi.paid_price, oi.unit_price, 0) * COALESCE(oi.quantity,1)) AS gross_sales,
      SUM(COALESCE(oi.commission_amount,0)) AS commission,
      SUM(COALESCE(oi.shipping_fee,0)) AS shipping_fee,
      SUM(COALESCE(pc.buy_price, pv.buy_price, p.buy_price, 0) * COALESCE(oi.quantity,1)) AS product_cost,
      SUM((COALESCE(oi.paid_price, oi.unit_price, 0) * COALESCE(oi.quantity,1)) - COALESCE(oi.commission_amount,0) - COALESCE(oi.shipping_fee,0) - (COALESCE(pc.buy_price, pv.buy_price, p.buy_price, 0) * COALESCE(oi.quantity,1))) AS estimated_net_sales
    FROM daraz_orders o
    LEFT JOIN daraz_order_items oi ON oi.order_db_id = o.id
    LEFT JOIN daraz_sku_mapping m ON m.account_code = o.account_code AND m.daraz_seller_sku = oi.seller_sku
    LEFT JOIN product_variations pv ON pv.sku = COALESCE(m.system_sku, m.correct_sku, oi.seller_sku)
    LEFT JOIN products p ON p.parent_sku = COALESCE(pv.parent_sku, m.system_sku, m.correct_sku, oi.seller_sku)
    LEFT JOIN daraz_product_costs pc ON pc.sku = COALESCE(m.system_sku, m.correct_sku, oi.seller_sku)
    ${whereSql}
    GROUP BY month_key, o.account_code
    ORDER BY month_key DESC, o.account_code ASC
  `, params).catch(() => []);

  const summary = rows.reduce((acc, r) => {
    acc.orders += safeNumber(r.orders);
    acc.units += safeNumber(r.units);
    acc.gross_sales += safeNumber(r.gross_sales);
    acc.commission += safeNumber(r.commission);
    acc.shipping_fee += safeNumber(r.shipping_fee);
    acc.product_cost += safeNumber(r.product_cost);
    acc.estimated_net_sales += safeNumber(r.estimated_net_sales);
    return acc;
  }, { orders: 0, units: 0, gross_sales: 0, commission: 0, shipping_fee: 0, product_cost: 0, estimated_net_sales: 0 });

  return { summary, rows };
};

exports.getSyncLogs = async ({ module = "", account_code = "", limit = 100 }) => {
  const where = [];
  const params = [];
  if (module) { where.push("module = ?"); params.push(module); }
  if (account_code) { where.push("account_code = ?"); params.push(account_code); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return query(`SELECT * FROM daraz_sync_logs ${whereSql} ORDER BY COALESCE(started_at, created_at) DESC LIMIT ?`, [...params, Number(limit)]).catch(() => []);
};

exports.getBusinessReports = async ({ account_code = "", months = 12 }) => {
  const net = await exports.getNetSales({ account_code });
  return {
    trend: net.rows.slice(0, Number(months)).reverse(),
    summary: net.summary
  };
};

exports.logAction = logAction;

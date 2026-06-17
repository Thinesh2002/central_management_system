const db = require("../../../config/product_management_db");

const tableCache = new Map();
const columnCache = new Map();

const safeJsonStringify = (data, fallback = "{}") => {
  try {
    if (data === undefined || data === null) return fallback;
    return JSON.stringify(data);
  } catch {
    return fallback;
  }
};

const tableExists = async (tableName) => {
  if (tableCache.has(tableName)) return tableCache.get(tableName);
  const [rows] = await db.query("SHOW TABLES LIKE ?", [tableName]);
  const exists = rows.length > 0;
  tableCache.set(tableName, exists);
  return exists;
};

const getColumns = async (tableName) => {
  if (columnCache.has(tableName)) return columnCache.get(tableName);
  const exists = await tableExists(tableName);
  if (!exists) return new Set();
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  const columns = new Set(rows.map((r) => r.Field));
  columnCache.set(tableName, columns);
  return columns;
};

const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const getLocalInventoryMap = async () => {
  if (!(await tableExists("inventory"))) return { rows: [], map: new Map(), tableMissing: true };
  const columns = await getColumns("inventory");
  const stockCol = columns.has("available_stock") ? "available_stock" : columns.has("total_stock") ? "total_stock" : null;
  const totalCol = columns.has("total_stock") ? "total_stock" : stockCol;
  const reservedCol = columns.has("reserved_stock") ? "reserved_stock" : null;
  const lastCol = columns.has("last_updated") ? "last_updated" : columns.has("updated_at") ? "updated_at" : null;

  if (!columns.has("sku")) return { rows: [], map: new Map(), tableMissing: false };

  const [rows] = await db.query(`
    SELECT sku,
           ${totalCol ? `${totalCol} AS total_stock` : "NULL AS total_stock"},
           ${stockCol ? `${stockCol} AS available_stock` : "NULL AS available_stock"},
           ${reservedCol ? `${reservedCol} AS reserved_stock` : "NULL AS reserved_stock"},
           ${lastCol ? `${lastCol} AS local_last_updated` : "NULL AS local_last_updated"}
    FROM inventory
  `);

  const map = new Map(rows.map((row) => [String(row.sku || "").trim().toLowerCase(), row]));
  return { rows, map, tableMissing: false };
};

const getVariationMap = async () => {
  if (!(await tableExists("product_variations"))) return { rows: [], map: new Map(), tableMissing: true };
  const columns = await getColumns("product_variations");
  if (!columns.has("sku")) return { rows: [], map: new Map(), tableMissing: false };

  const costCol = columns.has("cost_price") ? "cost_price" : columns.has("buy_price") ? "buy_price" : columns.has("product_buy_price") ? "product_buy_price" : null;
  const sellCol = columns.has("selling_price") ? "selling_price" : columns.has("price") ? "price" : null;
  const parentCol = columns.has("parent_sku") ? "parent_sku" : "NULL";
  const statusCol = columns.has("status") ? "status" : "NULL";

  const [rows] = await db.query(`
    SELECT sku,
           ${parentCol} AS parent_sku,
           ${costCol ? `${costCol} AS cost_price` : "NULL AS cost_price"},
           ${sellCol ? `${sellCol} AS local_selling_price` : "NULL AS local_selling_price"},
           ${statusCol} AS local_status
    FROM product_variations
  `);

  const map = new Map(rows.map((row) => [String(row.sku || "").trim().toLowerCase(), row]));
  return { rows, map, tableMissing: false };
};

exports.getInventoryHealth = async ({ page = 1, limit = 100, account_code = null, search = null, mismatch = "all" } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const where = [];
  const params = [];
  if (account_code && account_code !== "all") {
    where.push("s.account_code = ?");
    params.push(account_code);
  }
  if (search) {
    where.push("(s.seller_sku LIKE ? OR s.shop_sku LIKE ? OR p.name LIKE ? OR CAST(s.item_id AS CHAR) LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM daraz_skus s LEFT JOIN daraz_products p ON p.id = s.product_id ${whereSql}`, params);
  const [darazRows] = await db.query(
    `
    SELECT s.*, p.name AS product_name, p.account_name, p.status AS product_status, p.last_synced_at AS product_last_synced_at
    FROM daraz_skus s
    LEFT JOIN daraz_products p ON p.id = s.product_id
    ${whereSql}
    ORDER BY p.last_synced_at DESC, s.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, safeLimit, offset]
  );

  const localInventory = await getLocalInventoryMap();
  const localVariations = await getVariationMap();

  const rows = darazRows.map((row) => {
    const skuKey = String(row.seller_sku || row.shop_sku || "").trim().toLowerCase();
    const inv = localInventory.map.get(skuKey) || null;
    const variation = localVariations.map.get(skuKey) || null;
    const darazQty = numberOrNull(row.quantity) ?? 0;
    const localQty = inv ? (numberOrNull(inv.available_stock) ?? numberOrNull(inv.total_stock) ?? 0) : null;
    const darazPrice = numberOrNull(row.price);
    const localPrice = variation ? numberOrNull(variation.local_selling_price) : null;
    const costPrice = variation ? numberOrNull(variation.cost_price) : null;

    const issues = [];
    if (localInventory.tableMissing) issues.push("local_inventory_table_missing");
    if (localVariations.tableMissing) issues.push("local_product_variations_table_missing");
    if (!inv) issues.push("sku_not_in_local_inventory");
    if (!variation) issues.push("sku_not_in_product_system");
    if (inv && Number(localQty) !== Number(darazQty)) issues.push("stock_mismatch");
    if (variation && localPrice !== null && darazPrice !== null && Number(localPrice).toFixed(2) !== Number(darazPrice).toFixed(2)) issues.push("price_not_updated");
    if (variation && (costPrice === null || costPrice <= 0)) issues.push("product_cost_missing");
    if (darazQty <= 0) issues.push("daraz_oos");

    return {
      ...row,
      local_sku: inv?.sku || variation?.sku || null,
      local_stock: localQty,
      local_total_stock: inv?.total_stock ?? null,
      local_reserved_stock: inv?.reserved_stock ?? null,
      local_last_updated: inv?.local_last_updated || null,
      local_selling_price: localPrice,
      cost_price: costPrice,
      parent_sku: variation?.parent_sku || null,
      mismatch_status: issues.length ? "attention_required" : "matched",
      issues,
      issue_text: issues.length ? issues.map((x) => x.replace(/_/g, " ")).join(", ") : "Matched"
    };
  });

  const filteredRows = mismatch && mismatch !== "all"
    ? rows.filter((row) => row.issues.includes(mismatch) || row.mismatch_status === mismatch)
    : rows;

  const summary = filteredRows.reduce((acc, row) => {
    acc.total += 1;
    if (row.mismatch_status === "matched") acc.matched += 1;
    else acc.attention += 1;
    row.issues.forEach((issue) => { acc.issues[issue] = (acc.issues[issue] || 0) + 1; });
    return acc;
  }, { total: 0, matched: 0, attention: 0, issues: {} });

  return {
    page: safePage,
    limit: safeLimit,
    total: Number(countRows[0]?.total || 0),
    rows: filteredRows,
    summary,
    local_inventory_table_available: !localInventory.tableMissing,
    product_variations_table_available: !localVariations.tableMissing
  };
};

exports.getInventorySummary = async () => {
  const health = await exports.getInventoryHealth({ limit: 500 });
  const [darazTotals] = await db.query(`
    SELECT COUNT(*) AS daraz_skus,
           SUM(CASE WHEN COALESCE(quantity, 0) <= 0 THEN 1 ELSE 0 END) AS daraz_oos,
           COUNT(DISTINCT account_code) AS accounts
    FROM daraz_skus
  `);
  return {
    ...health.summary,
    daraz_skus: Number(darazTotals[0]?.daraz_skus || 0),
    daraz_oos: Number(darazTotals[0]?.daraz_oos || 0),
    accounts: Number(darazTotals[0]?.accounts || 0)
  };
};

exports.getOosSkus = async ({ account_code = null, search = null, limit = 100 } = {}) => {
  const result = await exports.getInventoryHealth({ account_code, search, limit, mismatch: "all" });
  return result.rows.filter((row) => Number(row.quantity || 0) <= 0 || Number(row.available || 0) <= 0 || Number(row.sellable_stock || 0) <= 0);
};

exports.addStockUpdateQueue = async ({ account_id = null, account_code, item_id, sku_id = null, seller_sku = null, target_quantity = null, target_price = null, target_special_price = null, update_type = "stock", requested_by = null, priority = "normal" }) => {
  const [result] = await db.query(
    `
    INSERT INTO daraz_stock_update_queue (
      account_id, account_code, item_id, sku_id, seller_sku, target_quantity, target_price,
      target_special_price, update_type, priority, status, requested_by, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
    `,
    [account_id, account_code, item_id, sku_id, seller_sku, target_quantity, target_price, target_special_price, update_type, priority, requested_by]
  );
  return result.insertId;
};

exports.queueLocalInventorySync = async ({ account_code = null, requested_by = "system" } = {}) => {
  const health = await exports.getInventoryHealth({ account_code, limit: 500, mismatch: "all" });
  let queued = 0;
  const skipped = [];

  for (const row of health.rows) {
    const shouldQueue = row.issues.includes("stock_mismatch") || row.issues.includes("price_not_updated");
    if (!shouldQueue || !row.local_sku) {
      if (row.mismatch_status !== "matched") skipped.push({ seller_sku: row.seller_sku, issues: row.issues });
      continue;
    }
    await exports.addStockUpdateQueue({
      account_id: row.account_id || null,
      account_code: row.account_code,
      item_id: row.item_id,
      sku_id: row.sku_id,
      seller_sku: row.seller_sku,
      target_quantity: row.local_stock,
      target_price: row.local_selling_price,
      update_type: row.issues.includes("price_not_updated") ? "price_stock" : "stock",
      requested_by,
      priority: "high"
    });
    queued += 1;
  }

  return { queued, skipped, summary: health.summary };
};

exports.getStockQueue = async ({ status = "pending", limit = 100 } = {}) => {
  const [rows] = await db.query(
    `SELECT * FROM daraz_stock_update_queue WHERE (? = 'all' OR status = ?) ORDER BY FIELD(priority, 'critical','high','normal','low'), id DESC LIMIT ?`,
    [status, status, Math.min(Number(limit) || 100, 500)]
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

exports.getInventoryHistory = async ({ account_code = null, seller_sku = null, limit = 100 } = {}) => {
  const where = [];
  const params = [];
  if (account_code) { where.push("account_code = ?"); params.push(account_code); }
  if (seller_sku) { where.push("seller_sku = ?"); params.push(seller_sku); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [rows] = await db.query(`SELECT * FROM daraz_inventory_history ${whereSql} ORDER BY id DESC LIMIT ?`, [...params, Math.min(Number(limit) || 100, 500)]);
  return rows;
};

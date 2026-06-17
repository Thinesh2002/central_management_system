const db = require("../../../../config/product_management_db");

const columnCache = new Map();

const safeJsonStringify = (data, fallback = "{}") => {
  try {
    if (data === undefined || data === null) return fallback;
    return JSON.stringify(data);
  } catch (error) {
    console.error("[JSON_STRINGIFY_ERROR]:", error.message);
    return fallback;
  }
};

const safeJsonParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const getTableColumns = async (tableName) => {
  if (columnCache.has(tableName)) return columnCache.get(tableName);

  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  const columns = new Set(rows.map((row) => row.Field));
  columnCache.set(tableName, columns);
  return columns;
};

const pickExistingColumns = async (tableName, data) => {
  const columns = await getTableColumns(tableName);
  const picked = {};

  Object.keys(data).forEach((key) => {
    if (columns.has(key)) picked[key] = data[key];
  });

  return picked;
};

const normalizeProduct = (account, product = {}) => {
  const attributes = product.attributes || {};

  return {
    account_id: account.id || account.account_id || null,
    account_code: account.account_code,
    account_name: account.account_name || null,
    item_id: product.item_id || product.ItemId || product.itemId,
    name: attributes.name || product.name || product.Name || null,
    brand: attributes.brand || product.brand || null,
    status: product.status || product.Status || null,
    product_type: product.product_type || product.type || null,
    qc_status: product.qc_status || product.qcStatus || null,
    primary_category: product.primary_category || product.primary_category_id || product.PrimaryCategory || null,
    primary_category_name: product.primary_category_name || product.category_name || null,
    product_url: product.product_url || product.url || product.Url || null,
    seller_id: account.seller_id || product.seller_id || null,
    currency: product.currency || product.Currency || null,
    short_description: attributes.short_description || product.short_description || null,
    description: attributes.description || product.description || null,
    attributes_json: safeJsonStringify(attributes),
    images_json: safeJsonStringify(product.images || product.Images || [], "[]"),
    raw_json: safeJsonStringify(product),
    daraz_created_time: product.created_time || product.created_at || product.CreatedTime || null,
    daraz_updated_time: product.updated_time || product.updated_at || product.UpdatedTime || null,
    last_synced_at: new Date(),
    is_missing_from_latest_sync: 0,
    missing_detected_at: null
  };
};

const normalizeSku = (sku = {}) => ({
  sku_id: sku.SkuId || sku.SkuID || sku.sku_id || sku.skuId || null,
  seller_sku: sku.SellerSku || sku.seller_sku || sku.sellerSku || null,
  shop_sku: sku.ShopSku || sku.shop_sku || sku.shopSku || null,
  sku_status: sku.Status || sku.status || null,
  price: sku.price ?? sku.Price ?? null,
  special_price: sku.special_price ?? sku.SpecialPrice ?? sku.specialPrice ?? null,
  currency: sku.currency || sku.Currency || null,
  quantity: Number(sku.quantity ?? sku.Quantity ?? 0),
  available: Number(sku.Available ?? sku.available ?? 0),
  sellable_stock: Number(sku.sellableStock ?? sku.sellable_stock ?? sku.SellableStock ?? 0),
  reserved_stock: Number(sku.reservedStock ?? sku.reserved_stock ?? 0),
  package_weight: Number(sku.package_weight ?? sku.PackageWeight ?? 0),
  package_length: Number(sku.package_length ?? sku.PackageLength ?? 0),
  package_width: Number(sku.package_width ?? sku.PackageWidth ?? 0),
  package_height: Number(sku.package_height ?? sku.PackageHeight ?? 0),
  variation_name: sku.variation_name || sku.VariationName || null,
  color_family: sku.color_family || sku.ColorFamily || sku.color || null,
  size: sku.size || sku.Size || null,
  url: sku.Url || sku.url || null,
  sku_images_json: safeJsonStringify(sku.Images || sku.images || [], "[]"),
  sku_raw_json: safeJsonStringify(sku),
  last_synced_at: new Date()
});

exports.upsertProduct = async (account, product) => {
  if (!account?.account_code || !product?.item_id) {
    throw new Error("[INVALID_ARGUMENTS]: Both account_code and item_id are required.");
  }

  const data = await pickExistingColumns("daraz_products", normalizeProduct(account, product));
  const columns = Object.keys(data);
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((column) => !["account_code", "item_id", "created_at"].includes(column))
    .map((column) => `${column} = VALUES(${column})`)
    .join(", ");

  await db.query(
    `
    INSERT INTO daraz_products (${columns.join(", ")})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates}
    `,
    Object.values(data)
  );

  const [rows] = await db.query(
    `SELECT id FROM daraz_products WHERE account_code = ? AND item_id = ? LIMIT 1`,
    [account.account_code, product.item_id]
  );

  return rows[0]?.id || null;
};

exports.syncProductSkus = async (productId, account, product, skusList = []) => {
  if (!productId || !account?.account_code || !product?.item_id) {
    throw new Error("[INVALID_ARGUMENTS]: Missing context for syncing SKU variations.");
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM daraz_skus WHERE product_id = ?`, [productId]);

    if (Array.isArray(skusList) && skusList.length > 0) {
      const tableColumns = await getTableColumns("daraz_skus");

      const bulkRows = skusList.map((sku) => {
        const normalized = normalizeSku(sku);
        const data = {
          product_id: productId,
          account_id: account.id || account.account_id || null,
          account_code: account.account_code,
          item_id: product.item_id,
          ...normalized
        };

        const picked = {};
        Object.keys(data).forEach((key) => {
          if (tableColumns.has(key)) picked[key] = data[key];
        });
        return picked;
      });

      if (bulkRows.length > 0) {
        const columns = Object.keys(bulkRows[0]);
        const values = bulkRows.map((row) => columns.map((column) => row[column]));

        await connection.query(
          `INSERT INTO daraz_skus (${columns.join(", ")}) VALUES ?`,
          [values]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error(`[MODEL_ERROR][syncProductSkus] Transaction aborted for product_id ${productId}:`, error.message);
    throw error;
  } finally {
    connection.release();
  }
};

exports.createSyncLog = async ({
  account_id = null,
  account_code,
  account_name,
  module = "products",
  sync_type = "manual",
  status = "success",
  total_products = 0,
  synced_products = 0,
  total_orders = 0,
  synced_orders = 0,
  total_skus = 0,
  synced_skus = 0,
  failed_records = 0,
  message = null,
  error = null,
  started_at = null,
  finished_at = null
}) => {
  const errorPayload = error
    ? safeJsonStringify({ name: error.name, message: error.message, stack: error.stack, response: error.response?.data || error.responseData || null })
    : null;

  try {
    const data = await pickExistingColumns("daraz_sync_logs", {
      account_id,
      account_code: account_code || null,
      account_name: account_name || null,
      module,
      sync_type,
      status,
      total_products,
      synced_products,
      total_orders,
      synced_orders,
      total_skus,
      synced_skus,
      failed_records,
      message,
      error: errorPayload,
      started_at,
      finished_at
    });

    const columns = Object.keys(data);
    const placeholders = columns.map(() => "?").join(", ");

    await db.query(
      `INSERT INTO daraz_sync_logs (${columns.join(", ")}) VALUES (${placeholders})`,
      Object.values(data)
    );
  } catch (err) {
    console.error("[CRITICAL_LOGGING_FAIL][createSyncLog]:", err.message);
  }
};

exports.getProducts = async ({ page = 1, limit = 50, account_code = null, status = null, search = null } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const where = [];
  const params = [];

  if (account_code) {
    where.push("p.account_code = ?");
    params.push(account_code);
  }

  if (status) {
    where.push("p.status = ?");
    params.push(status);
  }

  if (search) {
    where.push("(p.name LIKE ? OR p.brand LIKE ? OR CAST(p.item_id AS CHAR) LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM daraz_products p ${whereSql}`,
    params
  );

  const [rows] = await db.query(
    `
    SELECT p.*,
           COUNT(s.id) AS sku_count,
           SUM(CASE WHEN COALESCE(s.quantity, 0) <= 0 THEN 1 ELSE 0 END) AS oos_sku_count
    FROM daraz_products p
    LEFT JOIN daraz_skus s ON s.product_id = p.id
    ${whereSql}
    GROUP BY p.id
    ORDER BY p.last_synced_at DESC, p.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, safeLimit, offset]
  );

  return {
    page: safePage,
    limit: safeLimit,
    total: Number(countRows[0]?.total || 0),
    products: rows
  };
};

exports.getProductSkus = async (productId) => {
  if (!productId) throw new Error("product_id is required");
  const [rows] = await db.query(`SELECT * FROM daraz_skus WHERE product_id = ? ORDER BY id ASC`, [productId]);
  return rows;
};

exports.getProductById = async (productId) => {
  if (!productId) throw new Error("product_id is required");
  const [rows] = await db.query(`SELECT * FROM daraz_products WHERE id = ? LIMIT 1`, [productId]);
  return rows[0] || null;
};

exports.getProductByItemId = async (accountCode, itemId) => {
  const [rows] = await db.query(
    `SELECT * FROM daraz_products WHERE account_code = ? AND item_id = ? LIMIT 1`,
    [accountCode, itemId]
  );
  return rows[0] || null;
};

exports.getDashboardSummary = async () => {
  const [summary] = await db.query(`
    SELECT
      COUNT(DISTINCT p.id) AS total_products,
      COUNT(DISTINCT p.account_code) AS total_accounts,
      COUNT(DISTINCT p.item_id) AS total_item_ids,
      COUNT(DISTINCT s.id) AS total_skus,
      SUM(CASE WHEN COALESCE(s.quantity, 0) <= 0 THEN 1 ELSE 0 END) AS oos_skus,
      MAX(p.last_synced_at) AS latest_product_sync
    FROM daraz_products p
    LEFT JOIN daraz_skus s ON s.product_id = p.id
  `);

  const [byAccount] = await db.query(`
    SELECT
      p.account_code,
      p.account_name,
      COUNT(DISTINCT p.id) AS total_products,
      COUNT(DISTINCT p.item_id) AS total_item_ids,
      COUNT(DISTINCT s.id) AS total_skus,
      SUM(CASE WHEN COALESCE(s.quantity, 0) <= 0 THEN 1 ELSE 0 END) AS oos_skus,
      MAX(p.last_synced_at) AS latest_sync
    FROM daraz_products p
    LEFT JOIN daraz_skus s ON s.product_id = p.id
    GROUP BY p.account_code, p.account_name
    ORDER BY p.account_name ASC
  `);

  const [logs] = await db.query(`SELECT * FROM daraz_sync_logs ORDER BY id DESC LIMIT 15`).catch(() => [[]]);
  const [orders] = await db.query(`
    SELECT COUNT(*) AS total_orders,
           SUM(COALESCE(order_total, 0)) AS total_order_value,
           SUM(CASE WHEN LOWER(COALESCE(order_status,'')) LIKE '%cancel%' THEN 1 ELSE 0 END) AS cancelled_orders,
           MAX(daraz_created_at) AS latest_order_date
    FROM daraz_orders
  `).catch(() => [[{}]]);
  const [queue] = await db.query(`
    SELECT status, COUNT(*) AS total
    FROM daraz_stock_update_queue
    GROUP BY status
  `).catch(() => [[]]);

  return {
    summary: summary[0] || {},
    product_summary: byAccount,
    by_account: byAccount,
    order_summary: orders[0] || {},
    stock_queue_summary: queue,
    recent_sync_logs: logs
  };
};

exports.safeJsonParse = safeJsonParse;
exports.safeJsonStringify = safeJsonStringify;

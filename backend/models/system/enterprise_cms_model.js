const db = require("../../config/product_management_db");

const q = async (sql, params = []) => {
  const [rows] = await db.query(sql, params);
  return rows;
};
const e = async (sql, params = []) => {
  const [result] = await db.query(sql, params);
  return result;
};

const safeJson = (value, fallback = []) => {
  try {
    if (!value) return fallback;
    if (Array.isArray(value) || typeof value === "object") return value;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const tableExists = async (table) => {
  const rows = await q(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
};

const columnExists = async (table, column) => {
  const rows = await q(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
};

const addColumn = async (table, column, definition) => {
  if (!(await tableExists(table))) return;
  if (!(await columnExists(table, column))) {
    await e(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
};

const addIndex = async (table, name, sql) => {
  try {
    const rows = await q(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [name]);
    if (rows.length === 0) await e(sql);
  } catch (error) {
    console.warn(`[INDEX_SKIP][${table}.${name}]`, error.message);
  }
};

const log = async (payload) => {
  try {
    await e(
      `INSERT INTO system_action_logs (module, action, channel, account_code, reference_type, reference_id, status, message, payload_json, error_json, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.module || "system",
        payload.action || "update",
        payload.channel || null,
        payload.account_code || null,
        payload.reference_type || null,
        payload.reference_id || null,
        payload.status || "success",
        payload.message || null,
        payload.payload ? JSON.stringify(payload.payload) : null,
        payload.error ? JSON.stringify(payload.error) : null,
        payload.created_by || null,
      ]
    );
  } catch (error) {
    console.warn("[LOG_SKIP]", error.message);
  }
};

const imageFromDaraz = (row) => {
  const images = safeJson(row.images_json, []);
  if (Array.isArray(images) && images.length) {
    const first = images.find((img) => typeof img === "string" || img?.url || img?.image_url);
    return typeof first === "string" ? first : first?.url || first?.image_url || null;
  }
  const skuImages = safeJson(row.sku_images_json, []);
  if (Array.isArray(skuImages) && skuImages.length) {
    const first = skuImages.find((img) => typeof img === "string" || img?.url || img?.image_url);
    return typeof first === "string" ? first : first?.url || first?.image_url || null;
  }
  return row.image_url || row.main_image || null;
};

exports.ensureSchema = async () => {
  await e(`CREATE TABLE IF NOT EXISTS categories (
    id INT NOT NULL AUTO_INCREMENT,
    category_code VARCHAR(50) NULL,
    category_name VARCHAR(150) NULL,
    image_url TEXT NULL,
    description LONGTEXT NULL,
    created_by VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_category_code (category_code), KEY idx_category_name (category_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS sub_categories (
    id INT NOT NULL AUTO_INCREMENT,
    sub_category_code VARCHAR(50) NULL,
    sub_category_name VARCHAR(150) NULL,
    category_code VARCHAR(50) NULL,
    image_url TEXT NULL,
    description LONGTEXT NULL,
    created_by VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_sub_category_code (sub_category_code), KEY idx_sub_category_parent (category_code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS colours (
    id INT NOT NULL AUTO_INCREMENT,
    colour_code VARCHAR(50) NULL,
    colour_name VARCHAR(150) NULL,
    hex_code VARCHAR(20) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_colour_code (colour_code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS products (
    id INT NOT NULL AUTO_INCREMENT,
    parent_sku VARCHAR(255) NULL,
    product_name TEXT NULL,
    title TEXT NULL,
    product_type VARCHAR(50) NOT NULL DEFAULT 'parent',
    sub_category_code VARCHAR(50) NULL,
    model_code VARCHAR(50) NULL,
    brand VARCHAR(150) NULL,
    description LONGTEXT NULL,
    buy_price DECIMAL(12,2) NULL DEFAULT 0.00,
    cost_price DECIMAL(12,2) NULL DEFAULT 0.00,
    selling_price DECIMAL(12,2) NULL DEFAULT 0.00,
    currency VARCHAR(10) NULL DEFAULT 'LKR',
    pack_size INT NOT NULL DEFAULT 1,
    pack_code VARCHAR(30) NULL DEFAULT '1PK',
    product_status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by VARCHAR(150) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_products_parent_sku (parent_sku), KEY idx_products_status (product_status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS product_variations (
    id INT NOT NULL AUTO_INCREMENT,
    parent_sku VARCHAR(255) NULL,
    sku VARCHAR(255) NOT NULL,
    product_name TEXT NULL,
    colour_code VARCHAR(50) NULL,
    model_code VARCHAR(50) NULL,
    variation_name VARCHAR(255) NULL,
    buy_price DECIMAL(12,2) NULL DEFAULT 0.00,
    selling_price DECIMAL(12,2) NULL DEFAULT 0.00,
    pack_size INT NOT NULL DEFAULT 1,
    pack_code VARCHAR(30) NULL DEFAULT '1PK',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by VARCHAR(150) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_variation_sku (sku), KEY idx_variation_parent (parent_sku)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS inventory (
    id INT NOT NULL AUTO_INCREMENT,
    sku VARCHAR(255) NOT NULL,
    total_stock INT NOT NULL DEFAULT 0,
    reserved_stock INT NOT NULL DEFAULT 0,
    available_stock INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 5,
    warehouse_location VARCHAR(255) NULL,
    last_updated DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_inventory_sku (sku), KEY idx_inventory_available (available_stock)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS inventory_history (
    id INT NOT NULL AUTO_INCREMENT,
    sku VARCHAR(255) NOT NULL,
    old_stock INT NULL,
    new_stock INT NULL,
    change_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    source VARCHAR(100) NULL,
    reference_id VARCHAR(150) NULL,
    notes LONGTEXT NULL,
    changed_by VARCHAR(150) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_inv_hist_sku (sku), KEY idx_inv_hist_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS product_images (
    id INT NOT NULL AUTO_INCREMENT,
    sku VARCHAR(255) NULL,
    main_image TEXT NULL,
    sub_image1 TEXT NULL, sub_image2 TEXT NULL, sub_image3 TEXT NULL, sub_image4 TEXT NULL, sub_image5 TEXT NULL,
    sub_image6 TEXT NULL, sub_image7 TEXT NULL, sub_image8 TEXT NULL, sub_image9 TEXT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_product_images_sku (sku)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS channel_sku_mapping (
    id INT NOT NULL AUTO_INCREMENT,
    channel VARCHAR(50) NOT NULL,
    account_code VARCHAR(100) NULL,
    channel_sku VARCHAR(255) NOT NULL,
    system_sku VARCHAR(255) NOT NULL,
    product_id INT NULL,
    mapping_status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes LONGTEXT NULL,
    created_by VARCHAR(150) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_channel_sku (channel, account_code, channel_sku), KEY idx_channel_system_sku (system_sku)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS category_channel_mapping (
    id INT NOT NULL AUTO_INCREMENT,
    channel VARCHAR(50) NOT NULL DEFAULT 'daraz',
    account_code VARCHAR(100) NULL,
    local_category_code VARCHAR(50) NULL,
    local_sub_category_code VARCHAR(50) NULL,
    channel_category_id VARCHAR(100) NULL,
    channel_category_name VARCHAR(255) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes LONGTEXT NULL,
    created_by VARCHAR(150) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_cat_mapping_channel (channel, account_code), KEY idx_cat_mapping_local (local_category_code, local_sub_category_code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS pack_rules (
    id INT NOT NULL AUTO_INCREMENT,
    pack_size INT NOT NULL,
    pack_code VARCHAR(30) NOT NULL,
    pack_label VARCHAR(100) NULL,
    sku_suffix VARCHAR(30) NOT NULL,
    multiplier INT NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_pack_size (pack_size), UNIQUE KEY uk_pack_code (pack_code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS channel_stock_update_queue (
    id INT NOT NULL AUTO_INCREMENT,
    channel VARCHAR(50) NOT NULL,
    account_code VARCHAR(100) NULL,
    channel_sku VARCHAR(255) NOT NULL,
    system_sku VARCHAR(255) NULL,
    old_stock INT NULL,
    new_stock INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    message LONGTEXT NULL,
    response_json LONGTEXT NULL,
    created_by VARCHAR(150) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_stock_queue_channel (channel, account_code), KEY idx_stock_queue_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS system_action_logs (
    id INT NOT NULL AUTO_INCREMENT,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NULL,
    account_code VARCHAR(100) NULL,
    reference_type VARCHAR(100) NULL,
    reference_id VARCHAR(150) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'success',
    message LONGTEXT NULL,
    payload_json LONGTEXT NULL,
    error_json LONGTEXT NULL,
    created_by VARCHAR(150) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_action_logs_module (module), KEY idx_action_logs_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS user_feature_permissions (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NULL,
    role_name VARCHAR(100) NULL,
    feature_key VARCHAR(150) NOT NULL,
    can_view TINYINT(1) NOT NULL DEFAULT 1,
    can_edit TINYINT(1) NOT NULL DEFAULT 0,
    can_delete TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_feature_permission (user_id, role_name, feature_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS user_bookmarks (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NULL,
    feature_key VARCHAR(150) NOT NULL,
    label VARCHAR(150) NOT NULL,
    path VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 100,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_user_bookmark (user_id, feature_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS transfer_batches (
    id INT NOT NULL AUTO_INCREMENT,
    transfer_type VARCHAR(80) NOT NULL,
    source_channel VARCHAR(50) NULL,
    target_channel VARCHAR(50) NULL,
    source_account_code VARCHAR(100) NULL,
    target_account_code VARCHAR(100) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    total_items INT NOT NULL DEFAULT 0,
    success_items INT NOT NULL DEFAULT 0,
    failed_items INT NOT NULL DEFAULT 0,
    notes LONGTEXT NULL,
    created_by VARCHAR(150) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_transfer_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  await e(`CREATE TABLE IF NOT EXISTS transfer_items (
    id INT NOT NULL AUTO_INCREMENT,
    batch_id INT NOT NULL,
    source_sku VARCHAR(255) NULL,
    target_sku VARCHAR(255) NULL,
    source_item_id VARCHAR(150) NULL,
    target_item_id VARCHAR(150) NULL,
    payload_json LONGTEXT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message LONGTEXT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_transfer_items_batch (batch_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  // Add missing columns to old tables safely
  await addColumn("categories", "category_code", "VARCHAR(50) NULL");
  await addColumn("categories", "category_name", "VARCHAR(150) NULL");
  await addColumn("categories", "image_url", "TEXT NULL");
  await addColumn("categories", "description", "LONGTEXT NULL");
  await addColumn("categories", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");
  await addColumn("sub_categories", "sub_category_code", "VARCHAR(50) NULL");
  await addColumn("sub_categories", "sub_category_name", "VARCHAR(150) NULL");
  await addColumn("sub_categories", "category_code", "VARCHAR(50) NULL");
  await addColumn("sub_categories", "image_url", "TEXT NULL");
  await addColumn("sub_categories", "description", "LONGTEXT NULL");
  await addColumn("sub_categories", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");
  await addColumn("colours", "colour_code", "VARCHAR(50) NULL");
  await addColumn("colours", "colour_name", "VARCHAR(150) NULL");
  await addColumn("colours", "hex_code", "VARCHAR(20) NULL");
  await addColumn("products", "parent_sku", "VARCHAR(255) NULL");
  await addColumn("products", "product_name", "TEXT NULL");
  await addColumn("products", "title", "TEXT NULL");
  await addColumn("products", "product_type", "VARCHAR(50) NOT NULL DEFAULT 'parent'");
  await addColumn("products", "sub_category_code", "VARCHAR(50) NULL");
  await addColumn("products", "model_code", "VARCHAR(50) NULL");
  await addColumn("products", "brand", "VARCHAR(150) NULL");
  await addColumn("products", "description", "LONGTEXT NULL");
  await addColumn("products", "buy_price", "DECIMAL(12,2) NULL DEFAULT 0.00");
  await addColumn("products", "cost_price", "DECIMAL(12,2) NULL DEFAULT 0.00");
  await addColumn("products", "selling_price", "DECIMAL(12,2) NULL DEFAULT 0.00");
  await addColumn("products", "pack_size", "INT NOT NULL DEFAULT 1");
  await addColumn("products", "pack_code", "VARCHAR(30) NULL DEFAULT '1PK'");
  await addColumn("products", "product_status", "VARCHAR(50) NOT NULL DEFAULT 'active'");
  await addColumn("product_variations", "product_name", "TEXT NULL");
  await addColumn("product_variations", "colour_code", "VARCHAR(50) NULL");
  await addColumn("product_variations", "model_code", "VARCHAR(50) NULL");
  await addColumn("product_variations", "pack_size", "INT NOT NULL DEFAULT 1");
  await addColumn("product_variations", "pack_code", "VARCHAR(30) NULL DEFAULT '1PK'");
  await addColumn("product_images", "sku", "VARCHAR(255) NULL");
  await addColumn("product_images", "main_image", "TEXT NULL");
  for (let i = 1; i <= 9; i += 1) await addColumn("product_images", `sub_image${i}`, "TEXT NULL");
  await addColumn("daraz_skus", "system_sku", "VARCHAR(255) NULL");
  await addColumn("daraz_skus", "local_available_stock", "INT NULL");
  await addColumn("daraz_skus", "stock_sync_status", "VARCHAR(80) NULL DEFAULT 'not_checked'");
  await addColumn("daraz_skus", "last_stock_update_at", "DATETIME NULL");
  await addColumn("daraz_sku_mapping", "system_sku", "VARCHAR(255) NULL");
  await addColumn("daraz_sku_mapping", "correct_sku", "VARCHAR(255) NULL");
  await addColumn("daraz_sku_mapping", "created_by", "VARCHAR(150) NULL");

  await addIndex("products", "idx_products_parent_sku", "ALTER TABLE products ADD INDEX idx_products_parent_sku (parent_sku)");
  await addIndex("inventory", "idx_inventory_sku", "ALTER TABLE inventory ADD INDEX idx_inventory_sku (sku)");

  const packs = [
    [1, "1PK", "Single Pack", "", 1],
    [2, "2PK", "2 Pack", "2PK", 2],
    [3, "3PK", "3 Pack", "3PK", 3],
    [4, "4PK", "4 Pack", "4PK", 4],
    [5, "5PK", "5 Pack", "5PK", 5],
    [10, "10PK", "10 Pack", "10PK", 10]
  ];
  for (const p of packs) {
    await e(
      `INSERT INTO pack_rules (pack_size, pack_code, pack_label, sku_suffix, multiplier)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE pack_label = VALUES(pack_label), sku_suffix = VALUES(sku_suffix), multiplier = VALUES(multiplier)`,
      p
    );
  }
};

exports.generateSku = async ({ brand_prefix = "LS", sub_category_code = "CY", model_code = "001", colour_code = "BM", pack_size = 1 } = {}) => {
  await exports.ensureSchema();
  const [rule] = await q(`SELECT sku_suffix, pack_code FROM pack_rules WHERE pack_size = ? LIMIT 1`, [Number(pack_size || 1)]);
  const suffix = Number(pack_size || 1) > 1 ? (rule?.sku_suffix || rule?.pack_code || `${pack_size}PK`) : "";
  const sku = `${String(brand_prefix || "LS").toUpperCase()}${String(sub_category_code || "CY").toUpperCase()}${String(model_code || "001").toUpperCase()}${String(colour_code || "BM").toUpperCase()}${suffix}`;
  return { sku, pack_code: rule?.pack_code || (Number(pack_size || 1) > 1 ? `${pack_size}PK` : "1PK") };
};

exports.getDashboard = async () => {
  await exports.ensureSchema();
  const [local] = await q(`SELECT COUNT(*) AS products FROM products`).catch(() => [{ products: 0 }]);
  const [inv] = await q(`SELECT COUNT(*) AS skus, COALESCE(SUM(available_stock),0) AS stock, SUM(CASE WHEN available_stock <= reorder_level THEN 1 ELSE 0 END) AS low_stock FROM inventory`).catch(() => [{ skus: 0, stock: 0, low_stock: 0 }]);
  const [daraz] = await q(`SELECT COUNT(*) AS skus, COALESCE(SUM(quantity),0) AS stock, SUM(CASE WHEN system_sku IS NULL OR system_sku = '' THEN 1 ELSE 0 END) AS unmapped FROM daraz_skus`).catch(() => [{ skus: 0, stock: 0, unmapped: 0 }]);
  const [orders] = await q(`SELECT COUNT(*) AS orders, COALESCE(SUM(order_total),0) AS gross FROM daraz_orders`).catch(() => [{ orders: 0, gross: 0 }]);
  const logs = await q(`SELECT * FROM system_action_logs ORDER BY created_at DESC LIMIT 10`).catch(() => []);
  return { local, inventory: inv, daraz, orders, logs };
};

exports.getProducts = async ({ channel = "all", account_code = "", search = "", health = "", status = "", page = 1, limit = 250 } = {}) => {
  await exports.ensureSchema();
  const rows = [];
  const localRows = await q(`
    SELECT 'local' AS channel, NULL AS account_code, p.id AS product_id, p.parent_sku, COALESCE(pv.sku, p.parent_sku) AS sku,
      COALESCE(pv.product_name, p.product_name, p.title, p.parent_sku) AS product_name, p.product_type, p.brand, p.sub_category_code,
      COALESCE(pv.status, p.product_status) AS status, COALESCE(pv.selling_price, p.selling_price, 0) AS price,
      COALESCE(pv.buy_price, p.buy_price, p.cost_price, 0) AS buy_price, COALESCE(i.total_stock, 0) AS local_total_stock,
      COALESCE(i.reserved_stock, 0) AS reserved_stock, COALESCE(i.available_stock, 0) AS local_available_stock, NULL AS channel_stock,
      NULL AS item_id, NULL AS sku_id, img.main_image AS image_url, p.pack_code, p.pack_size,
      CASE WHEN COALESCE(i.available_stock,0) <= COALESCE(i.reorder_level,5) THEN 'low_stock' ELSE 'healthy' END AS health_status,
      p.created_at, p.updated_at
    FROM products p
    LEFT JOIN product_variations pv ON pv.parent_sku = p.parent_sku
    LEFT JOIN inventory i ON i.sku = COALESCE(pv.sku, p.parent_sku)
    LEFT JOIN product_images img ON img.sku = COALESCE(pv.sku, p.parent_sku)
  `).catch(() => []);

  const darazRows = await q(`
    SELECT 'daraz' AS channel, s.account_code, p.id AS product_id, NULL AS parent_sku, s.seller_sku AS sku,
      COALESCE(p.name, s.seller_sku) AS product_name, 'child' AS product_type, p.brand, p.primary_category AS sub_category_code,
      COALESCE(s.sku_status, p.status) AS status, COALESCE(s.special_price, s.price, 0) AS price,
      COALESCE(pc.buy_price, pv.buy_price, lp.buy_price, lp.cost_price, 0) AS buy_price,
      COALESCE(i.total_stock, 0) AS local_total_stock, COALESCE(i.reserved_stock, 0) AS reserved_stock, COALESCE(i.available_stock, 0) AS local_available_stock,
      COALESCE(s.quantity,0) AS channel_stock, s.item_id, s.sku_id, p.images_json, s.sku_images_json,
      COALESCE(cm.system_sku, dm.system_sku, dm.correct_sku, s.system_sku) AS system_sku,
      CASE
        WHEN COALESCE(cm.system_sku, dm.system_sku, dm.correct_sku, s.system_sku) IS NULL OR COALESCE(cm.system_sku, dm.system_sku, dm.correct_sku, s.system_sku) = '' THEN 'sku_not_mapped'
        WHEN i.sku IS NULL THEN 'sku_not_in_system'
        WHEN COALESCE(i.available_stock,0) <> COALESCE(s.quantity,0) THEN 'stock_mismatch'
        WHEN COALESCE(pc.buy_price, pv.buy_price, lp.buy_price, lp.cost_price, 0) = 0 THEN 'cost_missing'
        ELSE 'healthy'
      END AS health_status,
      p.daraz_created_time AS created_at, COALESCE(s.last_synced_at, p.last_synced_at, p.updated_at) AS updated_at
    FROM daraz_skus s
    LEFT JOIN daraz_products p ON p.id = s.product_id
    LEFT JOIN channel_sku_mapping cm ON cm.channel = 'daraz' AND cm.account_code = s.account_code AND cm.channel_sku = s.seller_sku
    LEFT JOIN daraz_sku_mapping dm ON dm.account_code = s.account_code AND dm.daraz_seller_sku = s.seller_sku
    LEFT JOIN inventory i ON i.sku = COALESCE(cm.system_sku, dm.system_sku, dm.correct_sku, s.system_sku)
    LEFT JOIN product_variations pv ON pv.sku = COALESCE(cm.system_sku, dm.system_sku, dm.correct_sku, s.system_sku)
    LEFT JOIN products lp ON lp.parent_sku = COALESCE(cm.system_sku, dm.system_sku, dm.correct_sku, s.system_sku)
    LEFT JOIN daraz_product_costs pc ON pc.sku = COALESCE(cm.system_sku, dm.system_sku, dm.correct_sku, s.system_sku, s.seller_sku)
  `).catch(() => []);

  const wooRows = await q(`
    SELECT 'woo' AS channel, NULL AS account_code, id AS product_id, sku AS parent_sku, sku, product_name, 'child' AS product_type,
      NULL AS brand, NULL AS sub_category_code, status, price, 0 AS buy_price, COALESCE(i.total_stock,0) AS local_total_stock,
      COALESCE(i.reserved_stock,0) AS reserved_stock, COALESCE(i.available_stock,0) AS local_available_stock, stock_quantity AS channel_stock,
      woo_product_id AS item_id, NULL AS sku_id, image_url,
      CASE WHEN i.sku IS NULL THEN 'sku_not_in_system' WHEN COALESCE(i.available_stock,0) <> COALESCE(stock_quantity,0) THEN 'stock_mismatch' ELSE 'healthy' END AS health_status,
      created_at, updated_at
    FROM woo_products
    LEFT JOIN inventory i ON i.sku = woo_products.sku
  `).catch(() => []);

  if (["all", "local", "system"].includes(channel)) rows.push(...localRows);
  if (["all", "daraz"].includes(channel)) rows.push(...darazRows.map((r) => ({ ...r, image_url: imageFromDaraz(r) })));
  if (["all", "woo", "woocommerce"].includes(channel)) rows.push(...wooRows);

  const filtered = rows.filter((r) => {
    if (account_code && String(r.account_code || "").toLowerCase() !== String(account_code).toLowerCase()) return false;
    if (status && String(r.status || "").toLowerCase() !== String(status).toLowerCase()) return false;
    if (health && String(r.health_status || "").toLowerCase() !== String(health).toLowerCase()) return false;
    if (search) {
      const hay = [r.sku, r.parent_sku, r.product_name, r.item_id, r.account_code, r.system_sku].join(" ").toLowerCase();
      if (!hay.includes(String(search).toLowerCase())) return false;
    }
    return true;
  });
  filtered.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Math.max(Number(limit) || 250, 1), 500);
  const start = (p - 1) * l;
  return { rows: filtered.slice(start, start + l), total: filtered.length, page: p, limit: l };
};

exports.saveProduct = async (data) => {
  await exports.ensureSchema();
  let sku = String(data.sku || "").trim();
  if (!sku) {
    const generated = await exports.generateSku(data);
    sku = generated.sku;
    data.pack_code = data.pack_code || generated.pack_code;
  }
  const parentSku = String(data.parent_sku || sku).trim();
  const productName = String(data.product_name || data.title || sku).trim();
  const type = String(data.product_type || (data.parent_sku && data.parent_sku !== sku ? "child" : "parent")).toLowerCase();
  const packSize = Number(data.pack_size || 1);
  const [pack] = await q(`SELECT pack_code FROM pack_rules WHERE pack_size = ? LIMIT 1`, [packSize]).catch(() => []);
  const packCode = data.pack_code || pack?.pack_code || (packSize > 1 ? `${packSize}PK` : "1PK");

  await e(
    `INSERT INTO products (parent_sku, product_name, title, product_type, sub_category_code, model_code, brand, description, buy_price, cost_price, selling_price, pack_size, pack_code, product_status, created_by)
     VALUES (?, ?, ?, 'parent', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
     ON DUPLICATE KEY UPDATE product_name=VALUES(product_name), title=VALUES(title), sub_category_code=VALUES(sub_category_code), model_code=VALUES(model_code), brand=VALUES(brand), description=VALUES(description), buy_price=VALUES(buy_price), cost_price=VALUES(cost_price), selling_price=VALUES(selling_price), pack_size=VALUES(pack_size), pack_code=VALUES(pack_code), updated_at=CURRENT_TIMESTAMP`,
    [parentSku, productName, productName, data.sub_category_code || null, data.model_code || null, data.brand || null, data.description || null, Number(data.buy_price || 0), Number(data.cost_price || data.buy_price || 0), Number(data.selling_price || 0), packSize, packCode, data.created_by || null]
  );

  await e(
    `INSERT INTO product_variations (parent_sku, sku, product_name, colour_code, model_code, variation_name, buy_price, selling_price, pack_size, pack_code, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
     ON DUPLICATE KEY UPDATE product_name=VALUES(product_name), colour_code=VALUES(colour_code), model_code=VALUES(model_code), variation_name=VALUES(variation_name), buy_price=VALUES(buy_price), selling_price=VALUES(selling_price), pack_size=VALUES(pack_size), pack_code=VALUES(pack_code), status='active', updated_at=CURRENT_TIMESTAMP`,
    [parentSku, sku, productName, data.colour_code || null, data.model_code || null, data.variation_name || productName, Number(data.buy_price || 0), Number(data.selling_price || 0), packSize, packCode, data.created_by || null]
  );

  const stock = Number(data.stock ?? data.total_stock ?? 0);
  await e(
    `INSERT INTO inventory (sku, total_stock, reserved_stock, available_stock, reorder_level, warehouse_location, last_updated)
     VALUES (?, ?, 0, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE total_stock=VALUES(total_stock), available_stock=VALUES(available_stock), reorder_level=VALUES(reorder_level), warehouse_location=VALUES(warehouse_location), last_updated=NOW()`,
    [sku, stock, stock, Number(data.reorder_level || 5), data.warehouse_location || null]
  );

  if (data.main_image || data.image_url) {
    await e(
      `INSERT INTO product_images (sku, main_image) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE main_image = VALUES(main_image), updated_at=CURRENT_TIMESTAMP`,
      [sku, data.main_image || data.image_url]
    ).catch(async () => {
      await e(`INSERT INTO product_images (sku, main_image) VALUES (?, ?)`, [sku, data.main_image || data.image_url]);
    });
  }
  await log({ module: "products", action: "save", channel: "local", reference_type: "sku", reference_id: sku, message: "Product saved", payload: data, created_by: data.created_by });
  return { sku, parent_sku: parentSku, product_name: productName, product_type: type, pack_code: packCode, stock };
};

exports.updateProduct = async (sku, data) => {
  await exports.ensureSchema();
  const fields = [];
  const vals = [];
  for (const field of ["product_name", "title", "sub_category_code", "model_code", "brand", "description", "buy_price", "cost_price", "selling_price", "pack_size", "pack_code", "product_status"]) {
    if (data[field] !== undefined) { fields.push(`${field} = ?`); vals.push(data[field]); }
  }
  if (fields.length) {
    vals.push(sku);
    await e(`UPDATE products SET ${fields.join(", ")}, updated_at=CURRENT_TIMESTAMP WHERE parent_sku = ?`, vals);
  }
  if (data.variation_name !== undefined || data.colour_code !== undefined || data.selling_price !== undefined || data.buy_price !== undefined) {
    const vFields = [];
    const vVals = [];
    for (const field of ["variation_name", "colour_code", "model_code", "buy_price", "selling_price", "pack_size", "pack_code", "status"]) {
      if (data[field] !== undefined) { vFields.push(`${field} = ?`); vVals.push(data[field]); }
    }
    if (vFields.length) {
      vVals.push(sku);
      await e(`UPDATE product_variations SET ${vFields.join(", ")}, updated_at=CURRENT_TIMESTAMP WHERE sku = ?`, vVals);
    }
  }
  await log({ module: "products", action: "update", channel: "local", reference_type: "sku", reference_id: sku, message: "Product updated", payload: data, created_by: data.created_by });
  return { sku };
};

exports.deleteProduct = async (sku, { hard = false, created_by = null } = {}) => {
  await exports.ensureSchema();
  if (hard) {
    await e(`DELETE FROM product_images WHERE sku = ?`, [sku]).catch(() => null);
    await e(`DELETE FROM inventory WHERE sku = ?`, [sku]).catch(() => null);
    await e(`DELETE FROM product_variations WHERE sku = ?`, [sku]).catch(() => null);
    await e(`DELETE FROM products WHERE parent_sku = ?`, [sku]).catch(() => null);
  } else {
    await e(`UPDATE product_variations SET status='inactive' WHERE sku = ?`, [sku]).catch(() => null);
    await e(`UPDATE products SET product_status='inactive' WHERE parent_sku = ?`, [sku]).catch(() => null);
  }
  await log({ module: "products", action: hard ? "delete" : "deactivate", channel: "local", reference_type: "sku", reference_id: sku, message: hard ? "Product deleted" : "Product deactivated", created_by });
  return { sku, hard };
};

exports.updateStock = async ({ channel = "local", account_code = null, sku, channel_sku, seller_sku, new_stock, created_by = null } = {}) => {
  await exports.ensureSchema();
  const stock = Number(new_stock);
  if (!Number.isFinite(stock) || stock < 0) { const err = new Error("Enter a valid stock quantity."); err.statusCode = 400; throw err; }
  const targetSku = String(sku || channel_sku || seller_sku || "").trim();
  if (!targetSku) { const err = new Error("SKU is required to update stock."); err.statusCode = 400; throw err; }
  const finalChannel = String(channel || "local").toLowerCase();
  let oldStock = null;
  if (["local", "system"].includes(finalChannel)) {
    const [old] = await q(`SELECT available_stock FROM inventory WHERE sku = ? LIMIT 1`, [targetSku]);
    oldStock = old?.available_stock ?? null;
    await e(`INSERT INTO inventory (sku, total_stock, reserved_stock, available_stock, last_updated) VALUES (?, ?, 0, ?, NOW()) ON DUPLICATE KEY UPDATE total_stock=VALUES(total_stock), available_stock=VALUES(available_stock), last_updated=NOW()`, [targetSku, stock, stock]);
    await e(`INSERT INTO inventory_history (sku, old_stock, new_stock, change_type, source, notes, changed_by) VALUES (?, ?, ?, 'manual', 'local', 'Updated from Manage All Inventory', ?)`, [targetSku, oldStock, stock, created_by]);
  }
  if (finalChannel === "daraz") {
    const targetChannelSku = channel_sku || seller_sku || targetSku;
    const [old] = await q(`SELECT quantity FROM daraz_skus WHERE account_code = ? AND seller_sku = ? LIMIT 1`, [account_code, targetChannelSku]).catch(() => []);
    oldStock = old?.quantity ?? null;
    await e(`UPDATE daraz_skus SET quantity=?, available=?, sellable_stock=?, stock_sync_status='queued_for_daraz', last_stock_update_at=NOW() WHERE account_code=? AND seller_sku=?`, [stock, stock, stock, account_code, targetChannelSku]).catch(() => null);
    await e(`INSERT INTO channel_stock_update_queue (channel, account_code, channel_sku, system_sku, old_stock, new_stock, status, message, created_by) VALUES ('daraz', ?, ?, ?, ?, ?, 'pending', 'Queued for Daraz stock API update', ?)`, [account_code, targetChannelSku, sku || null, oldStock, stock, created_by]);
  }
  if (["woo", "woocommerce"].includes(finalChannel)) {
    const [old] = await q(`SELECT stock_quantity FROM woo_products WHERE sku = ? LIMIT 1`, [targetSku]).catch(() => []);
    oldStock = old?.stock_quantity ?? null;
    await e(`UPDATE woo_products SET stock_quantity=?, updated_at=CURRENT_TIMESTAMP WHERE sku=?`, [stock, targetSku]).catch(() => null);
    await e(`INSERT INTO channel_stock_update_queue (channel, channel_sku, old_stock, new_stock, status, message, created_by) VALUES ('woo', ?, ?, ?, 'pending', 'Queued for WooCommerce stock API update', ?)`, [targetSku, oldStock, stock, created_by]);
  }
  await log({ module: "inventory", action: "stock_update", channel: finalChannel, account_code, reference_type: "sku", reference_id: targetSku, message: `Stock changed from ${oldStock ?? "-"} to ${stock}`, created_by, payload: { old_stock: oldStock, new_stock: stock } });
  return { sku: targetSku, channel: finalChannel, old_stock: oldStock, new_stock: stock, queued: !["local", "system"].includes(finalChannel) };
};

exports.saveSkuMapping = async ({ channel = "daraz", account_code = null, channel_sku, daraz_seller_sku, system_sku, correct_sku, notes = null, created_by = null } = {}) => {
  await exports.ensureSchema();
  const cSku = String(channel_sku || daraz_seller_sku || "").trim();
  const sSku = String(system_sku || correct_sku || "").trim();
  if (!cSku || !sSku) { const err = new Error("Channel SKU and correct system SKU are required."); err.statusCode = 400; throw err; }
  await e(`INSERT INTO channel_sku_mapping (channel, account_code, channel_sku, system_sku, mapping_status, notes, created_by) VALUES (?, ?, ?, ?, 'active', ?, ?) ON DUPLICATE KEY UPDATE system_sku=VALUES(system_sku), mapping_status='active', notes=VALUES(notes), updated_at=CURRENT_TIMESTAMP`, [channel, account_code, cSku, sSku, notes, created_by]);
  if (channel === "daraz") {
    await e(`INSERT INTO daraz_sku_mapping (account_code, daraz_seller_sku, system_sku, correct_sku, mapping_status, notes, created_by) VALUES (?, ?, ?, ?, 'active', ?, ?) ON DUPLICATE KEY UPDATE system_sku=VALUES(system_sku), correct_sku=VALUES(correct_sku), mapping_status='active', notes=VALUES(notes), updated_at=CURRENT_TIMESTAMP`, [account_code || "", cSku, sSku, sSku, notes, created_by]).catch(() => null);
    await e(`UPDATE daraz_skus SET system_sku = ? WHERE account_code = ? AND seller_sku = ?`, [sSku, account_code, cSku]).catch(() => null);
  }
  await log({ module: "sku_mapping", action: "save", channel, account_code, reference_type: "sku", reference_id: cSku, message: `Mapped ${cSku} to ${sSku}`, created_by });
  return { channel, account_code, channel_sku: cSku, system_sku: sSku };
};

exports.getMappings = async ({ channel = "", account_code = "", search = "" } = {}) => {
  await exports.ensureSchema();
  const where = [];
  const params = [];
  if (channel) { where.push("channel = ?"); params.push(channel); }
  if (account_code) { where.push("account_code = ?"); params.push(account_code); }
  if (search) { where.push("(channel_sku LIKE ? OR system_sku LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  return q(`SELECT * FROM channel_sku_mapping ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY updated_at DESC LIMIT 500`, params);
};

exports.getCategories = async () => {
  await exports.ensureSchema();
  const categories = await q(`SELECT id, category_code, category_name, image_url, description, is_active, created_at, updated_at FROM categories ORDER BY category_name ASC`).catch(() => []);
  const sub_categories = await q(`SELECT id, sub_category_code, sub_category_name, category_code, image_url, description, is_active, created_at, updated_at FROM sub_categories ORDER BY sub_category_name ASC`).catch(() => []);
  return { categories, sub_categories };
};

exports.saveCategory = async (data) => {
  await exports.ensureSchema();
  const code = String(data.category_code || "").trim().toUpperCase();
  if (!code) { const err = new Error("Category code is required."); err.statusCode = 400; throw err; }
  await e(`INSERT INTO categories (category_code, category_name, image_url, description, created_by, is_active) VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE category_name=VALUES(category_name), image_url=VALUES(image_url), description=VALUES(description), updated_at=CURRENT_TIMESTAMP`, [code, data.category_name || code, data.image_url || null, data.description || null, data.created_by || null]).catch(async () => {
    await e(`UPDATE categories SET category_name=?, image_url=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE category_code=?`, [data.category_name || code, data.image_url || null, data.description || null, code]);
  });
  return { category_code: code };
};

exports.saveSubCategory = async (data) => {
  await exports.ensureSchema();
  const code = String(data.sub_category_code || "").trim().toUpperCase();
  if (!code) { const err = new Error("Sub category code is required."); err.statusCode = 400; throw err; }
  await e(`INSERT INTO sub_categories (sub_category_code, sub_category_name, category_code, image_url, description, created_by, is_active) VALUES (?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE sub_category_name=VALUES(sub_category_name), category_code=VALUES(category_code), image_url=VALUES(image_url), description=VALUES(description), updated_at=CURRENT_TIMESTAMP`, [code, data.sub_category_name || code, data.category_code || null, data.image_url || null, data.description || null, data.created_by || null]).catch(async () => {
    await e(`UPDATE sub_categories SET sub_category_name=?, category_code=?, image_url=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE sub_category_code=?`, [data.sub_category_name || code, data.category_code || null, data.image_url || null, data.description || null, code]);
  });
  return { sub_category_code: code };
};

exports.deleteCategory = async (code, sub = false) => {
  await exports.ensureSchema();
  await e(sub ? `UPDATE sub_categories SET is_active=0 WHERE sub_category_code=?` : `UPDATE categories SET is_active=0 WHERE category_code=?`, [code]);
  return { code };
};

exports.saveCategoryMapping = async (data) => {
  await exports.ensureSchema();
  await e(`INSERT INTO category_channel_mapping (channel, account_code, local_category_code, local_sub_category_code, channel_category_id, channel_category_name, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`, [data.channel || "daraz", data.account_code || null, data.local_category_code || null, data.local_sub_category_code || null, data.channel_category_id || data.daraz_category_id || null, data.channel_category_name || data.daraz_category_name || null, data.notes || null, data.created_by || null]);
  return data;
};

exports.getCategoryMappings = async ({ channel = "daraz", account_code = "" } = {}) => {
  await exports.ensureSchema();
  const params = [channel];
  let sql = `SELECT * FROM category_channel_mapping WHERE channel = ?`;
  if (account_code) { sql += ` AND account_code = ?`; params.push(account_code); }
  sql += ` ORDER BY updated_at DESC LIMIT 500`;
  return q(sql, params);
};

exports.getImages = async ({ channel = "all", account_code = "", search = "" } = {}) => {
  const data = await exports.getProducts({ channel, account_code, search, limit: 500 });
  return data.rows.filter((r) => r.image_url).map((r) => ({ sku: r.sku, item_id: r.item_id, account_code: r.account_code, product_name: r.product_name, image_url: r.image_url, channel: r.channel }));
};

exports.getOrders = async ({ account_code = "", search = "", status = "", date_from = "2022-01-01", date_to = "" } = {}) => {
  await exports.ensureSchema();
  const where = [];
  const params = [];
  if (account_code) { where.push("o.account_code = ?"); params.push(account_code); }
  if (status) { where.push("o.order_status = ?"); params.push(status); }
  if (date_from) { where.push("DATE(o.daraz_created_at) >= ?"); params.push(date_from); }
  if (date_to) { where.push("DATE(o.daraz_created_at) <= ?"); params.push(date_to); }
  if (search) { where.push("(o.order_id LIKE ? OR oi.seller_sku LIKE ? OR oi.product_name LIKE ? OR o.customer_first_name LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  const rows = await q(`
    SELECT o.*, oi.seller_sku, oi.product_name AS item_name, oi.quantity, oi.paid_price, oi.item_status,
      oi.tracking_code AS item_tracking_code, oi.shipping_provider AS item_shipping_provider,
      pi.main_image, p.images_json
    FROM daraz_orders o
    LEFT JOIN daraz_order_items oi ON oi.order_db_id = o.id
    LEFT JOIN product_images pi ON pi.sku = oi.seller_sku
    LEFT JOIN daraz_products p ON p.item_id = oi.item_id AND p.account_code = o.account_code
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY COALESCE(o.daraz_created_at, o.created_at) DESC
    LIMIT 1000
  `, params).catch(() => []);
  return rows.map((r) => ({ ...r, image_url: imageFromDaraz(r) || r.main_image }));
};

exports.updateOrderStatus = async ({ order_id, order_item_id, status, tracking_code, shipping_provider, created_by = null }) => {
  await exports.ensureSchema();
  if (!order_id || !status) { const err = new Error("Order ID and status are required."); err.statusCode = 400; throw err; }
  await e(`UPDATE daraz_orders SET order_status=?, tracking_code=COALESCE(?, tracking_code), shipping_provider=COALESCE(?, shipping_provider), updated_at=CURRENT_TIMESTAMP WHERE order_id=?`, [status, tracking_code || null, shipping_provider || null, order_id]).catch(() => null);
  if (order_item_id) await e(`UPDATE daraz_order_items SET item_status=?, tracking_code=COALESCE(?, tracking_code), shipping_provider=COALESCE(?, shipping_provider), updated_at=CURRENT_TIMESTAMP WHERE order_item_id=?`, [status, tracking_code || null, shipping_provider || null, order_item_id]).catch(() => null);
  await e(`INSERT INTO daraz_order_status_history (account_code, order_id, order_item_id, new_status, source) SELECT account_code, order_id, ?, ?, 'manual' FROM daraz_orders WHERE order_id=? LIMIT 1`, [order_item_id || null, status, order_id]).catch(() => null);
  await log({ module: "orders", action: "status_update", channel: "daraz", reference_type: "order_id", reference_id: order_id, message: `Order status changed to ${status}`, created_by });
  return { order_id, status };
};

exports.getFinance = async ({ account_code = "", date_from = "2022-01-01", date_to = "" } = {}) => {
  const orders = await exports.getOrders({ account_code, date_from, date_to });
  const byMonth = new Map();
  let summary = { orders: 0, gross_sales: 0, commission: 0, shipping_fee: 0, product_cost: 0, estimated_net_sales: 0 };
  for (const row of orders) {
    const month = String(row.daraz_created_at || row.created_at || "").slice(0, 7) || "unknown";
    const gross = Number(row.paid_price || row.order_total || 0);
    const commission = Number(row.commission_amount || 0);
    const shipping = Number(row.shipping_fee || 0);
    const qty = Number(row.quantity || 1);
    let cost = 0;
    if (row.seller_sku) {
      const [c] = await q(`SELECT COALESCE(pv.buy_price, p.buy_price, p.cost_price, 0) AS cost FROM product_variations pv LEFT JOIN products p ON p.parent_sku = pv.parent_sku WHERE pv.sku = ? LIMIT 1`, [row.seller_sku]).catch(() => []);
      cost = Number(c?.cost || 0) * qty;
    }
    const net = gross - commission - shipping - cost;
    summary.orders += 1; summary.gross_sales += gross; summary.commission += commission; summary.shipping_fee += shipping; summary.product_cost += cost; summary.estimated_net_sales += net;
    const m = byMonth.get(month) || { month_key: month, orders: 0, gross_sales: 0, commission: 0, shipping_fee: 0, product_cost: 0, estimated_net_sales: 0 };
    m.orders += 1; m.gross_sales += gross; m.commission += commission; m.shipping_fee += shipping; m.product_cost += cost; m.estimated_net_sales += net;
    byMonth.set(month, m);
  }
  return { summary, rows: Array.from(byMonth.values()).sort((a, b) => a.month_key.localeCompare(b.month_key)) };
};

exports.getPackRules = async () => { await exports.ensureSchema(); return q(`SELECT * FROM pack_rules ORDER BY pack_size ASC`); };
exports.savePackRule = async (data) => { await exports.ensureSchema(); await e(`INSERT INTO pack_rules (pack_size, pack_code, pack_label, sku_suffix, multiplier) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE pack_code=VALUES(pack_code), pack_label=VALUES(pack_label), sku_suffix=VALUES(sku_suffix), multiplier=VALUES(multiplier), updated_at=CURRENT_TIMESTAMP`, [Number(data.pack_size), data.pack_code, data.pack_label || `${data.pack_size} Pack`, data.sku_suffix || data.pack_code, Number(data.multiplier || data.pack_size)]); return data; };
exports.getLogs = async ({ limit = 200 } = {}) => { await exports.ensureSchema(); return q(`SELECT * FROM system_action_logs ORDER BY created_at DESC LIMIT ?`, [Number(limit) || 200]); };

const db = require("../../config/product_management_db");

const q = async (sql, params = []) => {
  const [rows] = await db.query(sql, params);
  return rows;
};

const exec = async (sql, params = []) => {
  const [result] = await db.query(sql, params);
  return result;
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

const addColumnIfMissing = async (table, column, definition) => {
  if (!(await tableExists(table))) return;
  if (!(await columnExists(table, column))) {
    await exec(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
};

const getFirstExistingColumn = async (table, preferred) => {
  for (const col of preferred) {
    if (await columnExists(table, col)) return col;
  }
  return null;
};

const safeJson = (value, fallback = []) => {
  try {
    if (!value) return fallback;
    if (typeof value === "object") return value;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

exports.ensureUnifiedInventorySchema = async () => {
  await exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT NOT NULL AUTO_INCREMENT,
      category_code VARCHAR(50) NULL,
      category_name VARCHAR(150) NULL,
      created_by VARCHAR(100) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_categories_code (category_code),
      KEY idx_categories_name (category_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS sub_categories (
      id INT NOT NULL AUTO_INCREMENT,
      sub_category_code VARCHAR(50) NULL,
      sub_category_name VARCHAR(150) NULL,
      category_code VARCHAR(50) NULL,
      created_by VARCHAR(100) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_sub_categories_code (sub_category_code),
      KEY idx_sub_categories_category (category_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INT NOT NULL AUTO_INCREMENT,
      parent_sku VARCHAR(255) NULL,
      product_name TEXT NULL,
      title TEXT NULL,
      sub_category_code VARCHAR(50) NULL,
      brand VARCHAR(150) NULL,
      description LONGTEXT NULL,
      buy_price DECIMAL(12,2) NULL DEFAULT 0.00,
      cost_price DECIMAL(12,2) NULL DEFAULT 0.00,
      selling_price DECIMAL(12,2) NULL DEFAULT 0.00,
      currency VARCHAR(10) NULL DEFAULT 'LKR',
      pack_size INT NOT NULL DEFAULT 1,
      pack_code VARCHAR(30) NULL DEFAULT '1PK',
      product_status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_products_parent_sku (parent_sku),
      KEY idx_products_status (product_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS product_variations (
      id INT NOT NULL AUTO_INCREMENT,
      parent_sku VARCHAR(255) NULL,
      sku VARCHAR(255) NOT NULL,
      colour_code VARCHAR(50) NULL,
      variation_name VARCHAR(255) NULL,
      buy_price DECIMAL(12,2) NULL DEFAULT 0.00,
      selling_price DECIMAL(12,2) NULL DEFAULT 0.00,
      pack_size INT NOT NULL DEFAULT 1,
      pack_code VARCHAR(30) NULL DEFAULT '1PK',
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_product_variations_sku (sku),
      KEY idx_product_variations_parent (parent_sku)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS inventory (
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
      PRIMARY KEY (id),
      UNIQUE KEY uk_inventory_sku (sku),
      KEY idx_inventory_available (available_stock)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS inventory_history (
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
      PRIMARY KEY (id),
      KEY idx_inventory_history_sku (sku),
      KEY idx_inventory_history_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS channel_sku_mapping (
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
      PRIMARY KEY (id),
      UNIQUE KEY uk_channel_sku_mapping (channel, account_code, channel_sku),
      KEY idx_channel_sku_mapping_system (system_sku)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS pack_rules (
      id INT NOT NULL AUTO_INCREMENT,
      pack_size INT NOT NULL,
      pack_code VARCHAR(30) NOT NULL,
      pack_label VARCHAR(100) NULL,
      sku_suffix VARCHAR(30) NOT NULL,
      multiplier INT NOT NULL DEFAULT 1,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_pack_rules_pack_size (pack_size),
      UNIQUE KEY uk_pack_rules_pack_code (pack_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS channel_stock_update_queue (
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
      PRIMARY KEY (id),
      KEY idx_channel_stock_queue_channel (channel, account_code),
      KEY idx_channel_stock_queue_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS system_action_logs (
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
      PRIMARY KEY (id),
      KEY idx_system_logs_module (module),
      KEY idx_system_logs_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);


  await exec(`
    CREATE TABLE IF NOT EXISTS daraz_product_costs (
      id INT NOT NULL AUTO_INCREMENT,
      sku VARCHAR(255) NOT NULL,
      product_id INT NULL,
      buy_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      packaging_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      labour_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      other_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
      notes LONGTEXT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_daraz_product_cost_sku (sku)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS woo_products (
      id INT NOT NULL AUTO_INCREMENT,
      woo_product_id VARCHAR(100) NULL,
      sku VARCHAR(255) NULL,
      product_name TEXT NULL,
      image_url TEXT NULL,
      price DECIMAL(12,2) NULL DEFAULT 0.00,
      stock_quantity INT NULL DEFAULT 0,
      status VARCHAR(50) NULL DEFAULT 'active',
      raw_json LONGTEXT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_woo_products_sku (sku),
      KEY idx_woo_products_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await addColumnIfMissing("categories", "category_code", "VARCHAR(50) NULL");
  await addColumnIfMissing("categories", "category_name", "VARCHAR(150) NULL");
  await addColumnIfMissing("sub_categories", "sub_category_code", "VARCHAR(50) NULL");
  await addColumnIfMissing("sub_categories", "sub_category_name", "VARCHAR(150) NULL");
  await addColumnIfMissing("sub_categories", "category_code", "VARCHAR(50) NULL");
  await addColumnIfMissing("products", "parent_sku", "VARCHAR(255) NULL");
  await addColumnIfMissing("products", "product_name", "TEXT NULL");
  await addColumnIfMissing("products", "buy_price", "DECIMAL(12,2) NULL DEFAULT 0.00");
  await addColumnIfMissing("products", "cost_price", "DECIMAL(12,2) NULL DEFAULT 0.00");
  await addColumnIfMissing("products", "selling_price", "DECIMAL(12,2) NULL DEFAULT 0.00");
  await addColumnIfMissing("products", "pack_size", "INT NOT NULL DEFAULT 1");
  await addColumnIfMissing("products", "pack_code", "VARCHAR(30) NULL DEFAULT '1PK'");
  await addColumnIfMissing("products", "product_status", "VARCHAR(50) NOT NULL DEFAULT 'active'");
  await addColumnIfMissing("daraz_skus", "system_sku", "VARCHAR(255) NULL");
  await addColumnIfMissing("daraz_skus", "local_available_stock", "INT NULL");
  await addColumnIfMissing("daraz_skus", "stock_sync_status", "VARCHAR(80) NULL DEFAULT 'not_checked'");
  await addColumnIfMissing("daraz_skus", "last_stock_update_at", "DATETIME NULL");

  const defaults = [
    [1, "1PK", "Single Pack", "1PK", 1],
    [2, "2PK", "2 Pack", "2PK", 2],
    [3, "3PK", "3 Pack", "3PK", 3],
    [4, "4PK", "4 Pack", "4PK", 4],
    [5, "5PK", "5 Pack", "5PK", 5],
    [10, "10PK", "10 Pack", "10PK", 10]
  ];
  for (const row of defaults) {
    await exec(
      `INSERT INTO pack_rules (pack_size, pack_code, pack_label, sku_suffix, multiplier)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE pack_code = VALUES(pack_code), pack_label = VALUES(pack_label), sku_suffix = VALUES(sku_suffix), multiplier = VALUES(multiplier)`,
      row
    );
  }
};

const logAction = async (payload) => {
  try {
    await exec(
      `INSERT INTO system_action_logs (module, action, channel, account_code, reference_type, reference_id, status, message, payload_json, error_json, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.module || "inventory",
        payload.action || "update",
        payload.channel || null,
        payload.account_code || null,
        payload.reference_type || null,
        payload.reference_id || null,
        payload.status || "success",
        payload.message || null,
        payload.payload ? JSON.stringify(payload.payload) : null,
        payload.error ? JSON.stringify(payload.error) : null,
        payload.created_by || null
      ]
    );
  } catch (error) {
    console.error("[SYSTEM_ACTION_LOG_FAIL]", error.message);
  }
};

const extractImage = (row) => {
  const direct = row.image_url || row.main_image || row.sub_image1;
  if (direct) return direct;
  const images = safeJson(row.images_json, []);
  if (Array.isArray(images)) {
    const first = images.find((img) => typeof img === "string" || img?.url || img?.image_url);
    return typeof first === "string" ? first : (first?.url || first?.image_url || null);
  }
  return null;
};

exports.getDashboard = async () => {
  await exports.ensureUnifiedInventorySchema();
  const [local] = await q(`SELECT COUNT(*) AS products FROM products`);
  const [inventory] = await q(`SELECT COUNT(*) AS skus, SUM(available_stock) AS stock, SUM(CASE WHEN available_stock <= reorder_level THEN 1 ELSE 0 END) AS low_stock FROM inventory`);
  const [daraz] = await q(`SELECT COUNT(*) AS skus, SUM(quantity) AS stock, SUM(CASE WHEN system_sku IS NULL OR system_sku = '' THEN 1 ELSE 0 END) AS unmapped FROM daraz_skus`).catch(() => [{ skus: 0, stock: 0, unmapped: 0 }]);
  const [woo] = await q(`SELECT COUNT(*) AS products, SUM(stock_quantity) AS stock FROM woo_products`).catch(() => [{ products: 0, stock: 0 }]);
  const recent_logs = await q(`SELECT * FROM system_action_logs ORDER BY created_at DESC LIMIT 15`).catch(() => []);
  return { local, inventory, daraz, woo, recent_logs };
};

exports.getUnifiedInventory = async ({ channel = "all", account_code = "", search = "", status = "", health = "", page = 1, limit = 50 } = {}) => {
  await exports.ensureUnifiedInventorySchema();
  const rows = [];
  const localProductNameCol = await getFirstExistingColumn("products", ["product_name", "name", "title"]);
  const productImageSkuCol = (await tableExists("product_images")) ? await getFirstExistingColumn("product_images", ["sku", "parent_sku", "product_sku"]) : null;
  const productImageMainCol = (await tableExists("product_images")) ? await getFirstExistingColumn("product_images", ["main_image", "image_url", "url"]) : null;

  if (["all", "local", "system"].includes(channel)) {
    const localRows = await q(`
      SELECT
        'local' AS channel,
        NULL AS account_code,
        p.id AS product_id,
        p.parent_sku,
        COALESCE(pv.sku, p.parent_sku) AS sku,
        COALESCE(${localProductNameCol ? `p.\`${localProductNameCol}\`` : "p.parent_sku"}, p.parent_sku) AS product_name,
        p.brand,
        p.product_status AS status,
        COALESCE(pv.selling_price, p.selling_price, 0) AS price,
        COALESCE(pv.buy_price, p.buy_price, p.cost_price, 0) AS buy_price,
        i.total_stock AS local_total_stock,
        i.reserved_stock AS reserved_stock,
        i.available_stock AS local_available_stock,
        NULL AS channel_stock,
        NULL AS item_id,
        NULL AS sku_id,
        ${productImageMainCol && productImageSkuCol ? `img.\`${productImageMainCol}\`` : "NULL"} AS image_url,
        CASE WHEN COALESCE(i.available_stock,0) <= COALESCE(i.reorder_level,5) THEN 'low_stock' ELSE 'healthy' END AS health_status,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN product_variations pv ON pv.parent_sku = p.parent_sku
      LEFT JOIN inventory i ON i.sku = COALESCE(pv.sku, p.parent_sku)
      ${productImageMainCol && productImageSkuCol ? `LEFT JOIN product_images img ON img.\`${productImageSkuCol}\` = p.parent_sku` : ""}
    `).catch(() => []);
    rows.push(...localRows);
  }

  if (["all", "daraz"].includes(channel)) {
    const darazRows = await q(`
      SELECT
        'daraz' AS channel,
        s.account_code,
        p.id AS product_id,
        NULL AS parent_sku,
        s.seller_sku AS sku,
        COALESCE(p.name, s.seller_sku) AS product_name,
        p.brand,
        COALESCE(s.sku_status, p.status) AS status,
        COALESCE(s.special_price, s.price, 0) AS price,
        COALESCE(pc.buy_price, pv.buy_price, lp.buy_price, p.buy_price, p.cost_price, 0) AS buy_price,
        i.total_stock AS local_total_stock,
        i.reserved_stock AS reserved_stock,
        i.available_stock AS local_available_stock,
        s.quantity AS channel_stock,
        s.item_id,
        s.sku_id,
        p.images_json,
        COALESCE(m.system_sku, m.correct_sku, s.system_sku) AS system_sku,
        CASE
          WHEN COALESCE(m.system_sku, m.correct_sku, s.system_sku) IS NULL OR COALESCE(m.system_sku, m.correct_sku, s.system_sku) = '' THEN 'sku_not_mapped'
          WHEN i.sku IS NULL THEN 'sku_not_in_system'
          WHEN COALESCE(i.available_stock,0) <> COALESCE(s.quantity,0) THEN 'stock_mismatch'
          WHEN COALESCE(pc.buy_price, pv.buy_price, lp.buy_price, p.buy_price, p.cost_price, 0) = 0 THEN 'cost_missing'
          ELSE 'healthy'
        END AS health_status,
        p.created_at,
        COALESCE(s.last_synced_at, p.last_synced_at, p.updated_at) AS updated_at
      FROM daraz_skus s
      LEFT JOIN daraz_products p ON p.id = s.product_id
      LEFT JOIN daraz_sku_mapping m ON m.account_code = s.account_code AND m.daraz_seller_sku = s.seller_sku
      LEFT JOIN channel_sku_mapping cm ON cm.channel = 'daraz' AND cm.account_code = s.account_code AND cm.channel_sku = s.seller_sku
      LEFT JOIN inventory i ON i.sku = COALESCE(cm.system_sku, m.system_sku, m.correct_sku, s.system_sku, s.seller_sku)
      LEFT JOIN product_variations pv ON pv.sku = COALESCE(cm.system_sku, m.system_sku, m.correct_sku, s.system_sku)
      LEFT JOIN products lp ON lp.parent_sku = COALESCE(cm.system_sku, m.system_sku, m.correct_sku, s.system_sku)
      LEFT JOIN daraz_product_costs pc ON pc.sku = COALESCE(cm.system_sku, m.system_sku, m.correct_sku, s.system_sku, s.seller_sku)
    `).catch(() => []);
    rows.push(...darazRows.map((r) => ({ ...r, image_url: extractImage(r) })));
  }

  if (["all", "woo", "woocommerce"].includes(channel)) {
    const wooRows = await q(`
      SELECT
        'woo' AS channel,
        NULL AS account_code,
        id AS product_id,
        sku AS parent_sku,
        sku,
        product_name,
        NULL AS brand,
        status,
        price,
        NULL AS buy_price,
        i.total_stock AS local_total_stock,
        i.reserved_stock AS reserved_stock,
        i.available_stock AS local_available_stock,
        stock_quantity AS channel_stock,
        woo_product_id AS item_id,
        NULL AS sku_id,
        image_url,
        CASE WHEN i.sku IS NULL THEN 'sku_not_in_system' WHEN COALESCE(i.available_stock,0) <> COALESCE(stock_quantity,0) THEN 'stock_mismatch' ELSE 'healthy' END AS health_status,
        created_at,
        updated_at
      FROM woo_products wp
      LEFT JOIN inventory i ON i.sku = wp.sku
    `).catch(() => []);
    rows.push(...wooRows);
  }

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
  const l = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const start = (p - 1) * l;
  return { rows: filtered.slice(start, start + l), total: filtered.length, page: p, limit: l };
};

exports.getCategories = async () => {
  await exports.ensureUnifiedInventorySchema();
  const categories = await q(`SELECT id, category_code, category_name, is_active, created_at, updated_at FROM categories ORDER BY category_name ASC`).catch(() => []);
  const sub_categories = await q(`SELECT id, sub_category_code, sub_category_name, category_code, is_active FROM sub_categories ORDER BY sub_category_name ASC`).catch(() => []);
  return { categories, sub_categories };
};

exports.addProduct = async (data) => {
  await exports.ensureUnifiedInventorySchema();
  const sku = String(data.sku || data.parent_sku || "").trim();
  if (!sku) {
    const err = new Error("SKU is required to create a product.");
    err.statusCode = 400;
    throw err;
  }
  const name = String(data.product_name || data.name || data.title || sku).trim();
  const packSize = Number(data.pack_size || 1);
  const [rule] = await q(`SELECT pack_code FROM pack_rules WHERE pack_size = ? LIMIT 1`, [packSize]);
  const packCode = data.pack_code || rule?.pack_code || `${packSize}PK`;

  await exec(
    `INSERT INTO products (parent_sku, product_name, brand, description, buy_price, cost_price, selling_price, pack_size, pack_code, product_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE product_name = VALUES(product_name), brand = VALUES(brand), buy_price = VALUES(buy_price), cost_price = VALUES(cost_price), selling_price = VALUES(selling_price), pack_size = VALUES(pack_size), pack_code = VALUES(pack_code), updated_at = CURRENT_TIMESTAMP`,
    [sku, name, data.brand || null, data.description || null, Number(data.buy_price || 0), Number(data.cost_price || data.buy_price || 0), Number(data.selling_price || 0), packSize, packCode]
  );

  await exec(
    `INSERT INTO product_variations (parent_sku, sku, variation_name, buy_price, selling_price, pack_size, pack_code, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE variation_name = VALUES(variation_name), buy_price = VALUES(buy_price), selling_price = VALUES(selling_price), pack_size = VALUES(pack_size), pack_code = VALUES(pack_code), updated_at = CURRENT_TIMESTAMP`,
    [sku, sku, data.variation_name || name, Number(data.buy_price || 0), Number(data.selling_price || 0), packSize, packCode]
  );

  const stock = Number(data.stock || data.total_stock || 0);
  await exec(
    `INSERT INTO inventory (sku, total_stock, reserved_stock, available_stock, last_updated)
     VALUES (?, ?, 0, ?, NOW())
     ON DUPLICATE KEY UPDATE total_stock = VALUES(total_stock), available_stock = VALUES(available_stock), last_updated = NOW()`,
    [sku, stock, stock]
  );

  if (data.image_url && await tableExists("product_images")) {
    const skuCol = await getFirstExistingColumn("product_images", ["sku", "parent_sku", "product_sku"]);
    const imgCol = await getFirstExistingColumn("product_images", ["main_image", "image_url", "url"]);
    if (skuCol && imgCol) {
      await exec(
        `INSERT INTO product_images (\`${skuCol}\`, \`${imgCol}\`) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE \`${imgCol}\` = VALUES(\`${imgCol}\`)`,
        [sku, data.image_url]
      ).catch(() => null);
    }
  }

  await logAction({ module: "products", action: "create_or_update", channel: "local", reference_type: "sku", reference_id: sku, message: "Local product saved", payload: data, created_by: data.created_by || null });
  return { sku, product_name: name, stock, pack_code: packCode };
};

exports.updateStock = async ({ channel = "local", account_code = null, sku, channel_sku, seller_sku, new_stock, created_by = null }) => {
  await exports.ensureUnifiedInventorySchema();
  const finalChannel = String(channel || "local").toLowerCase();
  const stock = Number(new_stock);
  if (!Number.isFinite(stock) || stock < 0) {
    const err = new Error("Enter a valid stock quantity.");
    err.statusCode = 400;
    throw err;
  }
  const targetSku = sku || channel_sku || seller_sku;
  if (!targetSku) {
    const err = new Error("SKU is required to update stock.");
    err.statusCode = 400;
    throw err;
  }

  let oldStock = null;
  if (finalChannel === "local" || finalChannel === "system") {
    const [old] = await q(`SELECT available_stock FROM inventory WHERE sku = ? LIMIT 1`, [targetSku]);
    oldStock = old?.available_stock ?? null;
    await exec(
      `INSERT INTO inventory (sku, total_stock, reserved_stock, available_stock, last_updated)
       VALUES (?, ?, 0, ?, NOW())
       ON DUPLICATE KEY UPDATE total_stock = VALUES(total_stock), available_stock = VALUES(available_stock), last_updated = NOW()`,
      [targetSku, stock, stock]
    );
    await exec(`INSERT INTO inventory_history (sku, old_stock, new_stock, change_type, source, notes, changed_by) VALUES (?, ?, ?, 'manual', 'local', 'Local stock edited from Manage All Inventory', ?)`, [targetSku, oldStock, stock, created_by]);
  }

  if (finalChannel === "daraz") {
    const [old] = await q(`SELECT quantity FROM daraz_skus WHERE account_code = ? AND seller_sku = ? LIMIT 1`, [account_code, targetSku]).catch(() => []);
    oldStock = old?.quantity ?? null;
    await exec(`UPDATE daraz_skus SET quantity = ?, available = ?, sellable_stock = ?, stock_sync_status = 'queued_for_daraz', last_stock_update_at = NOW() WHERE account_code = ? AND seller_sku = ?`, [stock, stock, stock, account_code, targetSku]).catch(() => null);
    await exec(`INSERT INTO channel_stock_update_queue (channel, account_code, channel_sku, system_sku, old_stock, new_stock, status, message, created_by) VALUES ('daraz', ?, ?, ?, ?, ?, 'pending', 'Queued for Daraz price_quantity update API', ?)`, [account_code, targetSku, sku || null, oldStock, stock, created_by]);
    await exec(`INSERT INTO daraz_stock_update_queue (account_code, seller_sku, target_quantity, update_type, status, requested_by) VALUES (?, ?, ?, 'stock', 'pending', ?)`, [account_code, targetSku, stock, created_by]).catch(() => null);
  }

  if (finalChannel === "woo" || finalChannel === "woocommerce") {
    const [old] = await q(`SELECT stock_quantity FROM woo_products WHERE sku = ? LIMIT 1`, [targetSku]).catch(() => []);
    oldStock = old?.stock_quantity ?? null;
    await exec(`UPDATE woo_products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE sku = ?`, [stock, targetSku]).catch(() => null);
    await exec(`INSERT INTO channel_stock_update_queue (channel, channel_sku, old_stock, new_stock, status, message, created_by) VALUES ('woo', ?, ?, ?, 'pending', 'Queued for WooCommerce stock API update', ?)`, [targetSku, oldStock, stock, created_by]);
  }

  await logAction({ module: "inventory", action: "stock_update", channel: finalChannel, account_code, reference_type: "sku", reference_id: targetSku, message: `Stock changed from ${oldStock ?? "-"} to ${stock}`, payload: { old_stock: oldStock, new_stock: stock }, created_by });
  return { channel: finalChannel, sku: targetSku, old_stock: oldStock, new_stock: stock, queued: finalChannel !== "local" && finalChannel !== "system" };
};

exports.saveSkuMapping = async ({ channel = "daraz", account_code = null, channel_sku, daraz_seller_sku, system_sku, correct_sku, notes = null, created_by = null }) => {
  await exports.ensureUnifiedInventorySchema();
  const finalChannelSku = channel_sku || daraz_seller_sku;
  const finalSystemSku = system_sku || correct_sku;
  if (!finalChannelSku || !finalSystemSku) {
    const err = new Error("Channel SKU and correct system SKU are required.");
    err.statusCode = 400;
    throw err;
  }
  await exec(
    `INSERT INTO channel_sku_mapping (channel, account_code, channel_sku, system_sku, mapping_status, notes, created_by)
     VALUES (?, ?, ?, ?, 'active', ?, ?)
     ON DUPLICATE KEY UPDATE system_sku = VALUES(system_sku), mapping_status = 'active', notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP`,
    [channel, account_code, finalChannelSku, finalSystemSku, notes, created_by]
  );
  if (channel === "daraz") {
    await exec(
      `INSERT INTO daraz_sku_mapping (account_code, daraz_seller_sku, system_sku, correct_sku, mapping_status, notes, created_by)
       VALUES (?, ?, ?, ?, 'active', ?, ?)
       ON DUPLICATE KEY UPDATE system_sku = VALUES(system_sku), correct_sku = VALUES(correct_sku), mapping_status = 'active', notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP`,
      [account_code || "", finalChannelSku, finalSystemSku, finalSystemSku, notes, created_by]
    ).catch(() => null);
    await exec(`UPDATE daraz_skus SET system_sku = ? WHERE account_code = ? AND seller_sku = ?`, [finalSystemSku, account_code, finalChannelSku]).catch(() => null);
  }
  await logAction({ module: "sku_mapping", action: "save", channel, account_code, reference_type: "channel_sku", reference_id: finalChannelSku, message: `Mapped ${finalChannelSku} to ${finalSystemSku}`, payload: { channel_sku: finalChannelSku, system_sku: finalSystemSku }, created_by });
  return { channel, account_code, channel_sku: finalChannelSku, system_sku: finalSystemSku };
};

exports.getSkuMappings = async ({ channel = "", account_code = "", search = "" } = {}) => {
  await exports.ensureUnifiedInventorySchema();
  const where = [];
  const params = [];
  if (channel) { where.push("channel = ?"); params.push(channel); }
  if (account_code) { where.push("account_code = ?"); params.push(account_code); }
  if (search) { where.push("(channel_sku LIKE ? OR system_sku LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  return q(`SELECT * FROM channel_sku_mapping ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY updated_at DESC LIMIT 500`, params);
};

exports.getPackRules = async () => {
  await exports.ensureUnifiedInventorySchema();
  return q(`SELECT * FROM pack_rules ORDER BY pack_size ASC`);
};

exports.savePackRule = async ({ pack_size, pack_code, pack_label, sku_suffix, multiplier }) => {
  await exports.ensureUnifiedInventorySchema();
  if (!pack_size || !pack_code) {
    const err = new Error("Pack size and pack code are required.");
    err.statusCode = 400;
    throw err;
  }
  await exec(
    `INSERT INTO pack_rules (pack_size, pack_code, pack_label, sku_suffix, multiplier)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE pack_code = VALUES(pack_code), pack_label = VALUES(pack_label), sku_suffix = VALUES(sku_suffix), multiplier = VALUES(multiplier), updated_at = CURRENT_TIMESTAMP`,
    [Number(pack_size), pack_code, pack_label || `${pack_size} Pack`, sku_suffix || pack_code, Number(multiplier || pack_size)]
  );
  return { pack_size, pack_code };
};

exports.getLogs = async ({ limit = 100 } = {}) => {
  await exports.ensureUnifiedInventorySchema();
  return q(`SELECT * FROM system_action_logs ORDER BY created_at DESC LIMIT ?`, [Number(limit) || 100]);
};

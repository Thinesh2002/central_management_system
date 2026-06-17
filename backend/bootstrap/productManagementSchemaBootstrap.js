const db = require("../config/product_management_db");

const columnCache = new Set();

const q = async (sql, params = []) => {
  const [rows] = await db.query(sql, params);
  return rows;
};

const tableExists = async (tableName) => {
  const rows = await q(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [tableName]
  );
  return rows.length > 0;
};

const columnExists = async (tableName, columnName) => {
  const cacheKey = `${tableName}.${columnName}`;
  if (columnCache.has(cacheKey)) return true;
  const rows = await q(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [tableName, columnName]
  );
  if (rows.length > 0) columnCache.add(cacheKey);
  return rows.length > 0;
};

const addColumnIfMissing = async (tableName, columnName, definition) => {
  if (!(await tableExists(tableName))) return;
  if (!(await columnExists(tableName, columnName))) {
    await q(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
    columnCache.add(`${tableName}.${columnName}`);
  }
};

const createCoreTables = async () => {
  await q(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT NOT NULL AUTO_INCREMENT,
      category_code VARCHAR(50) NOT NULL,
      category_name VARCHAR(150) NOT NULL,
      created_by VARCHAR(100) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_categories_code (category_code),
      KEY idx_categories_name (category_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS sub_categories (
      id INT NOT NULL AUTO_INCREMENT,
      sub_category_code VARCHAR(50) NOT NULL,
      sub_category_name VARCHAR(150) NOT NULL,
      category_code VARCHAR(50) NOT NULL,
      created_by VARCHAR(100) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_sub_categories_code (sub_category_code),
      KEY idx_sub_categories_category (category_code),
      KEY idx_sub_categories_name (sub_category_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS products (
      id INT NOT NULL AUTO_INCREMENT,
      parent_sku VARCHAR(100) NOT NULL,
      product_name TEXT NOT NULL,
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
      UNIQUE KEY uk_products_parent_sku (parent_sku),
      KEY idx_products_sub_category (sub_category_code),
      KEY idx_products_brand (brand),
      KEY idx_products_status (product_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS product_variations (
      id INT NOT NULL AUTO_INCREMENT,
      parent_sku VARCHAR(100) NOT NULL,
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

  await q(`
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
      KEY idx_inventory_available (available_stock),
      KEY idx_inventory_last_updated (last_updated)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await q(`
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
};

const createDarazAdvancedTables = async () => {
  await q(`
    CREATE TABLE IF NOT EXISTS daraz_sku_mapping (
      id INT NOT NULL AUTO_INCREMENT,
      account_code VARCHAR(100) NOT NULL,
      daraz_item_id BIGINT NULL,
      daraz_sku_id BIGINT NULL,
      daraz_seller_sku VARCHAR(255) NOT NULL,
      system_sku VARCHAR(255) NULL,
      correct_sku VARCHAR(255) NULL,
      product_id INT NULL,
      mapping_status VARCHAR(50) NOT NULL DEFAULT 'active',
      mismatch_type VARCHAR(80) NULL,
      notes LONGTEXT NULL,
      created_by VARCHAR(150) NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_daraz_sku_mapping_account_sku (account_code, daraz_seller_sku),
      KEY idx_daraz_sku_mapping_system (system_sku),
      KEY idx_daraz_sku_mapping_status (mapping_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS daraz_category_mapping (
      id INT NOT NULL AUTO_INCREMENT,
      account_code VARCHAR(100) NULL,
      local_category_code VARCHAR(80) NULL,
      local_category_name VARCHAR(255) NULL,
      local_sub_category_code VARCHAR(80) NULL,
      local_sub_category_name VARCHAR(255) NULL,
      daraz_category_id BIGINT NOT NULL,
      daraz_category_name VARCHAR(255) NULL,
      required_attributes_completed TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      notes LONGTEXT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_daraz_category_mapping_safe (account_code, local_category_code, local_sub_category_code, daraz_category_id),
      KEY idx_daraz_category_mapping_daraz (daraz_category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS daraz_pack_rules (
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
      UNIQUE KEY uk_daraz_pack_size (pack_size),
      UNIQUE KEY uk_daraz_pack_code (pack_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS daraz_stock_update_logs (
      id INT NOT NULL AUTO_INCREMENT,
      account_code VARCHAR(100) NOT NULL,
      item_id BIGINT NULL,
      sku_id BIGINT NULL,
      seller_sku VARCHAR(255) NULL,
      system_sku VARCHAR(255) NULL,
      old_daraz_stock INT NULL,
      new_daraz_stock INT NULL,
      local_stock INT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      response_json LONGTEXT NULL,
      error_message LONGTEXT NULL,
      requested_by VARCHAR(150) NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_daraz_stock_logs_account (account_code),
      KEY idx_daraz_stock_logs_sku (seller_sku),
      KEY idx_daraz_stock_logs_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS daraz_system_action_logs (
      id INT NOT NULL AUTO_INCREMENT,
      module VARCHAR(100) NOT NULL,
      action VARCHAR(100) NOT NULL,
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
      KEY idx_system_action_logs_module (module),
      KEY idx_system_action_logs_account (account_code),
      KEY idx_system_action_logs_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await q(`
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

  await q(`
    CREATE TABLE IF NOT EXISTS user_feature_permissions (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NULL,
      role_name VARCHAR(100) NULL,
      feature_key VARCHAR(150) NOT NULL,
      can_view TINYINT(1) NOT NULL DEFAULT 0,
      can_create TINYINT(1) NOT NULL DEFAULT 0,
      can_edit TINYINT(1) NOT NULL DEFAULT 0,
      can_delete TINYINT(1) NOT NULL DEFAULT 0,
      can_sync TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_user_feature_permissions (user_id, role_name, feature_key),
      KEY idx_user_feature_permissions_feature (feature_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS user_bookmarks (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NULL,
      feature_key VARCHAR(150) NOT NULL,
      label VARCHAR(150) NOT NULL,
      path VARCHAR(255) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_user_bookmark (user_id, feature_key),
      KEY idx_user_bookmark_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
};

const alterExistingTables = async () => {
  await addColumnIfMissing("categories", "category_code", "VARCHAR(50) NULL");
  await addColumnIfMissing("categories", "category_name", "VARCHAR(150) NULL");
  await addColumnIfMissing("categories", "created_by", "VARCHAR(100) NULL");
  await addColumnIfMissing("categories", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");
  await addColumnIfMissing("categories", "updated_at", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

  await addColumnIfMissing("products", "buy_price", "DECIMAL(12,2) NULL DEFAULT 0.00");
  await addColumnIfMissing("products", "cost_price", "DECIMAL(12,2) NULL DEFAULT 0.00");
  await addColumnIfMissing("products", "selling_price", "DECIMAL(12,2) NULL DEFAULT 0.00");
  await addColumnIfMissing("products", "pack_size", "INT NOT NULL DEFAULT 1");
  await addColumnIfMissing("products", "pack_code", "VARCHAR(30) NULL DEFAULT '1PK'");
  await addColumnIfMissing("products", "product_status", "VARCHAR(50) NOT NULL DEFAULT 'active'");

  await addColumnIfMissing("daraz_accounts", "sync_status", "VARCHAR(50) NOT NULL DEFAULT 'active'");
  await addColumnIfMissing("daraz_accounts", "api_base_url", "VARCHAR(255) NULL");
  await addColumnIfMissing("daraz_accounts", "access_token_expires_at", "DATETIME NULL");
  await addColumnIfMissing("daraz_accounts", "refresh_token_expires_at", "DATETIME NULL");
  await addColumnIfMissing("daraz_accounts", "last_product_sync_at", "DATETIME NULL");
  await addColumnIfMissing("daraz_accounts", "last_order_sync_at", "DATETIME NULL");

  await addColumnIfMissing("daraz_products", "buy_price", "DECIMAL(12,2) NULL DEFAULT 0.00");
  await addColumnIfMissing("daraz_products", "cost_price", "DECIMAL(12,2) NULL DEFAULT 0.00");
  await addColumnIfMissing("daraz_products", "product_url", "TEXT NULL");
  await addColumnIfMissing("daraz_products", "last_detail_synced_at", "DATETIME NULL");

  await addColumnIfMissing("daraz_skus", "system_sku", "VARCHAR(255) NULL");
  await addColumnIfMissing("daraz_skus", "local_available_stock", "INT NULL");
  await addColumnIfMissing("daraz_skus", "stock_sync_status", "VARCHAR(80) NULL DEFAULT 'not_checked'");
  await addColumnIfMissing("daraz_skus", "last_stock_update_at", "DATETIME NULL");
};

const seedDefaults = async () => {
  const packRules = [
    [1, "1PK", "Single Pack", "1PK", 1],
    [2, "2PK", "2 Pack", "2PK", 2],
    [3, "3PK", "3 Pack", "3PK", 3],
    [4, "4PK", "4 Pack", "4PK", 4],
    [5, "5PK", "5 Pack", "5PK", 5],
    [10, "10PK", "10 Pack", "10PK", 10]
  ];
  for (const row of packRules) {
    await q(
      `INSERT INTO daraz_pack_rules (pack_size, pack_code, pack_label, sku_suffix, multiplier)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE pack_code = VALUES(pack_code), pack_label = VALUES(pack_label), sku_suffix = VALUES(sku_suffix), multiplier = VALUES(multiplier)`,
      row
    );
  }
};

const bootstrapProductManagementSchema = async () => {
  try {
    await createCoreTables();
    await createDarazAdvancedTables();
    await alterExistingTables();
    await seedDefaults();
    console.log("[PM_SCHEMA_BOOTSTRAP]: Product management schema verified.");
  } catch (error) {
    console.error("[PM_SCHEMA_BOOTSTRAP_FAIL]:", error.message);
  }
};

module.exports = { bootstrapProductManagementSchema };

-- =========================================================
-- SAFE DARAZ API DATABASE UPDATE - V2
-- Target existing database: product_management
-- Compatible with older MySQL/MariaDB/phpMyAdmin
--
-- IMPORTANT:
-- ✅ This script DOES NOT DROP any existing table.
-- ✅ This script DOES NOT EMPTY any existing table.
-- ✅ Existing tables protected:
--    categories, colours, product_images,
--    daraz_products, daraz_skus, daraz_sync_logs
--
-- Use this V2 if phpMyAdmin shows error near:
-- ADD COLUMN IF NOT EXISTS
-- ADD INDEX IF NOT EXISTS
-- =========================================================

USE product_management;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Recommended backup before running:
-- mysqldump -u root -p product_management > product_management_backup_before_daraz_update.sql

-- =========================================================
-- Helper procedures: add columns/indexes only if missing
-- =========================================================

DROP PROCEDURE IF EXISTS add_daraz_column_if_missing;
DROP PROCEDURE IF EXISTS add_daraz_index_if_missing;

DELIMITER $$

CREATE PROCEDURE add_daraz_column_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_column_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @sql_stmt = CONCAT(
      'ALTER TABLE `', p_table_name, '` ADD COLUMN `', p_column_name, '` ', p_column_definition
    );
    PREPARE stmt FROM @sql_stmt;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE add_daraz_index_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_index_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @sql_stmt = CONCAT(
      'ALTER TABLE `', p_table_name, '` ADD INDEX `', p_index_name, '` ', p_index_definition
    );
    PREPARE stmt FROM @sql_stmt;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- =========================================================
-- 1. Existing table update: daraz_products
-- =========================================================

CALL add_daraz_column_if_missing('daraz_products', 'product_url', 'TEXT NULL AFTER `primary_category`');
CALL add_daraz_column_if_missing('daraz_products', 'seller_id', 'VARCHAR(100) NULL AFTER `product_url`');
CALL add_daraz_column_if_missing('daraz_products', 'currency', 'VARCHAR(10) NULL AFTER `seller_id`');
CALL add_daraz_column_if_missing('daraz_products', 'primary_category_name', 'VARCHAR(255) NULL AFTER `primary_category`');
CALL add_daraz_column_if_missing('daraz_products', 'product_type', 'VARCHAR(100) NULL AFTER `status`');
CALL add_daraz_column_if_missing('daraz_products', 'qc_status', 'VARCHAR(100) NULL AFTER `product_type`');
CALL add_daraz_column_if_missing('daraz_products', 'is_missing_from_latest_sync', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `last_synced_at`');
CALL add_daraz_column_if_missing('daraz_products', 'missing_detected_at', 'DATETIME NULL AFTER `is_missing_from_latest_sync`');
CALL add_daraz_column_if_missing('daraz_products', 'last_detail_synced_at', 'DATETIME NULL AFTER `missing_detected_at`');

CALL add_daraz_index_if_missing('daraz_products', 'idx_daraz_products_account_code', '(`account_code`)');
CALL add_daraz_index_if_missing('daraz_products', 'idx_daraz_products_item_id', '(`item_id`)');
CALL add_daraz_index_if_missing('daraz_products', 'idx_daraz_products_status', '(`status`)');
CALL add_daraz_index_if_missing('daraz_products', 'idx_daraz_products_last_synced', '(`last_synced_at`)');

-- =========================================================
-- 2. Existing table update: daraz_skus
-- =========================================================

CALL add_daraz_column_if_missing('daraz_skus', 'account_id', 'INT(11) NULL AFTER `product_id`');
CALL add_daraz_column_if_missing('daraz_skus', 'currency', 'VARCHAR(10) NULL AFTER `special_price`');
CALL add_daraz_column_if_missing('daraz_skus', 'reserved_stock', 'INT(11) NOT NULL DEFAULT 0 AFTER `sellable_stock`');
CALL add_daraz_column_if_missing('daraz_skus', 'variation_name', 'VARCHAR(255) NULL AFTER `package_height`');
CALL add_daraz_column_if_missing('daraz_skus', 'color_family', 'VARCHAR(255) NULL AFTER `variation_name`');
CALL add_daraz_column_if_missing('daraz_skus', 'size', 'VARCHAR(255) NULL AFTER `color_family`');
CALL add_daraz_column_if_missing('daraz_skus', 'last_synced_at', 'DATETIME NULL AFTER `sku_raw_json`');

CALL add_daraz_index_if_missing('daraz_skus', 'idx_daraz_skus_account_code', '(`account_code`)');
CALL add_daraz_index_if_missing('daraz_skus', 'idx_daraz_skus_item_id', '(`item_id`)');
CALL add_daraz_index_if_missing('daraz_skus', 'idx_daraz_skus_seller_sku', '(`seller_sku`)');
CALL add_daraz_index_if_missing('daraz_skus', 'idx_daraz_skus_sku_status', '(`sku_status`)');
CALL add_daraz_index_if_missing('daraz_skus', 'idx_daraz_skus_stock', '(`quantity`, `available`, `sellable_stock`)');
CALL add_daraz_index_if_missing('daraz_skus', 'idx_daraz_skus_price', '(`price`)');

-- =========================================================
-- 3. Existing table update: daraz_sync_logs
-- =========================================================

CALL add_daraz_column_if_missing('daraz_sync_logs', 'account_id', 'INT(11) NULL AFTER `id`');
CALL add_daraz_column_if_missing('daraz_sync_logs', 'module', 'VARCHAR(50) NOT NULL DEFAULT ''products'' AFTER `account_name`');
CALL add_daraz_column_if_missing('daraz_sync_logs', 'sync_type', 'VARCHAR(50) NOT NULL DEFAULT ''manual'' AFTER `module`');
CALL add_daraz_column_if_missing('daraz_sync_logs', 'total_orders', 'INT(11) NOT NULL DEFAULT 0 AFTER `synced_products`');
CALL add_daraz_column_if_missing('daraz_sync_logs', 'synced_orders', 'INT(11) NOT NULL DEFAULT 0 AFTER `total_orders`');
CALL add_daraz_column_if_missing('daraz_sync_logs', 'total_skus', 'INT(11) NOT NULL DEFAULT 0 AFTER `synced_orders`');
CALL add_daraz_column_if_missing('daraz_sync_logs', 'synced_skus', 'INT(11) NOT NULL DEFAULT 0 AFTER `total_skus`');
CALL add_daraz_column_if_missing('daraz_sync_logs', 'failed_records', 'INT(11) NOT NULL DEFAULT 0 AFTER `synced_skus`');

CALL add_daraz_index_if_missing('daraz_sync_logs', 'idx_daraz_sync_logs_account_code', '(`account_code`)');
CALL add_daraz_index_if_missing('daraz_sync_logs', 'idx_daraz_sync_logs_module_status', '(`module`, `status`)');
CALL add_daraz_index_if_missing('daraz_sync_logs', 'idx_daraz_sync_logs_started', '(`started_at`)');

-- Remove helper procedures after table update
DROP PROCEDURE IF EXISTS add_daraz_column_if_missing;
DROP PROCEDURE IF EXISTS add_daraz_index_if_missing;

-- =========================================================
-- New Daraz feature tables
-- =========================================================

CREATE TABLE IF NOT EXISTS daraz_accounts (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  seller_id VARCHAR(100) NULL,
  user_id VARCHAR(100) NULL,
  country_code VARCHAR(10) NOT NULL DEFAULT 'LK',
  marketplace VARCHAR(50) NOT NULL DEFAULT 'daraz_lk',
  api_base_url VARCHAR(255) NOT NULL DEFAULT 'https://api.daraz.lk/rest',

  app_key VARCHAR(255) NULL,
  app_secret_encrypted LONGTEXT NULL,

  access_token LONGTEXT NULL,
  refresh_token LONGTEXT NULL,
  access_token_expires_at DATETIME NULL,
  refresh_token_expires_at DATETIME NULL,
  last_token_refresh_at DATETIME NULL,
  token_status VARCHAR(50) NOT NULL DEFAULT 'missing',

  sync_status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_product_sync_at DATETIME NULL,
  last_order_sync_at DATETIME NULL,
  last_inventory_sync_at DATETIME NULL,
  last_category_sync_at DATETIME NULL,

  notes LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_accounts_code (account_code),
  KEY idx_daraz_accounts_status (sync_status),
  KEY idx_daraz_accounts_country (country_code),
  KEY idx_daraz_accounts_token_status (token_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_account_settings (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NOT NULL,
  sync_products TINYINT(1) NOT NULL DEFAULT 1,
  sync_orders TINYINT(1) NOT NULL DEFAULT 1,
  sync_inventory TINYINT(1) NOT NULL DEFAULT 1,
  sync_categories TINYINT(1) NOT NULL DEFAULT 1,
  auto_refresh_token TINYINT(1) NOT NULL DEFAULT 1,
  auto_stock_update TINYINT(1) NOT NULL DEFAULT 0,
  auto_price_update TINYINT(1) NOT NULL DEFAULT 0,
  product_sync_interval_minutes INT(11) NOT NULL DEFAULT 120,
  order_sync_interval_minutes INT(11) NOT NULL DEFAULT 15,
  inventory_sync_interval_minutes INT(11) NOT NULL DEFAULT 60,
  max_parallel_requests INT(11) NOT NULL DEFAULT 2,
  default_currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_account_settings_account (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_auth_sessions (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  state_token VARCHAR(255) NOT NULL,
  auth_code LONGTEXT NULL,
  redirect_uri TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  response_json LONGTEXT NULL,
  error_message LONGTEXT NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_auth_state (state_token),
  KEY idx_daraz_auth_account (account_id),
  KEY idx_daraz_auth_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_token_logs (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NULL,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  old_access_token_expires_at DATETIME NULL,
  new_access_token_expires_at DATETIME NULL,
  old_refresh_token_expires_at DATETIME NULL,
  new_refresh_token_expires_at DATETIME NULL,
  message LONGTEXT NULL,
  error_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_token_logs_account (account_id),
  KEY idx_daraz_token_logs_code (account_code),
  KEY idx_daraz_token_logs_action_status (action, status),
  KEY idx_daraz_token_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- 5. API / CRON LOGS
-- =========================================================

CREATE TABLE IF NOT EXISTS daraz_api_logs (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NULL,
  api_path VARCHAR(255) NOT NULL,
  http_method VARCHAR(20) NOT NULL DEFAULT 'GET',
  request_params_json LONGTEXT NULL,
  request_body_json LONGTEXT NULL,
  response_code VARCHAR(50) NULL,
  response_json LONGTEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'success',
  error_message LONGTEXT NULL,
  duration_ms INT(11) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_api_logs_account (account_id),
  KEY idx_daraz_api_logs_code (account_code),
  KEY idx_daraz_api_logs_path (api_path),
  KEY idx_daraz_api_logs_status (status),
  KEY idx_daraz_api_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_cron_logs (
  id INT(11) NOT NULL AUTO_INCREMENT,
  job_name VARCHAR(150) NOT NULL,
  module VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  total_accounts INT(11) NOT NULL DEFAULT 0,
  success_accounts INT(11) NOT NULL DEFAULT 0,
  failed_accounts INT(11) NOT NULL DEFAULT 0,
  message LONGTEXT NULL,
  error_json LONGTEXT NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_cron_job (job_name),
  KEY idx_daraz_cron_module_status (module, status),
  KEY idx_daraz_cron_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- 6. DARAZ CATEGORY / ATTRIBUTES / BRANDS
-- Does NOT touch your existing categories table.
-- =========================================================

CREATE TABLE IF NOT EXISTS daraz_categories (
  id INT(11) NOT NULL AUTO_INCREMENT,
  country_code VARCHAR(10) NOT NULL DEFAULT 'LK',
  category_id BIGINT(20) NOT NULL,
  parent_category_id BIGINT(20) NULL,
  category_name VARCHAR(255) NOT NULL,
  category_path TEXT NULL,
  is_leaf TINYINT(1) NOT NULL DEFAULT 0,
  level_no INT(11) NULL,
  raw_json LONGTEXT NULL,
  last_synced_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_categories_country_category (country_code, category_id),
  KEY idx_daraz_categories_parent (parent_category_id),
  KEY idx_daraz_categories_leaf (is_leaf),
  KEY idx_daraz_categories_name (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_category_attributes (
  id INT(11) NOT NULL AUTO_INCREMENT,
  country_code VARCHAR(10) NOT NULL DEFAULT 'LK',
  category_id BIGINT(20) NOT NULL,
  attribute_id VARCHAR(100) NULL,
  attribute_name VARCHAR(255) NOT NULL,
  input_type VARCHAR(100) NULL,
  attribute_type VARCHAR(100) NULL,
  is_mandatory TINYINT(1) NOT NULL DEFAULT 0,
  is_sale_prop TINYINT(1) NOT NULL DEFAULT 0,
  is_sku_attribute TINYINT(1) NOT NULL DEFAULT 0,
  options_json LONGTEXT NULL,
  raw_json LONGTEXT NULL,
  last_synced_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_cat_attr (country_code, category_id, attribute_name),
  KEY idx_daraz_cat_attr_category (country_code, category_id),
  KEY idx_daraz_cat_attr_mandatory (is_mandatory),
  KEY idx_daraz_cat_attr_sku (is_sku_attribute)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_category_brands (
  id INT(11) NOT NULL AUTO_INCREMENT,
  country_code VARCHAR(10) NOT NULL DEFAULT 'LK',
  category_id BIGINT(20) NOT NULL,
  brand_id VARCHAR(100) NULL,
  brand_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  raw_json LONGTEXT NULL,
  last_synced_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_category_brand (country_code, category_id, brand_name),
  KEY idx_daraz_category_brand_category (country_code, category_id),
  KEY idx_daraz_category_brand_name (brand_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_category_mapping (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  local_category_id INT(11) NULL,
  local_category_name VARCHAR(255) NOT NULL,
  daraz_country_code VARCHAR(10) NOT NULL DEFAULT 'LK',
  daraz_category_id BIGINT(20) NOT NULL,
  daraz_category_name VARCHAR(255) NULL,
  required_attributes_completed TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  notes LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_category_mapping (account_id, local_category_name, daraz_country_code),
  KEY idx_daraz_category_mapping_daraz (daraz_country_code, daraz_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_brand_mapping (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  local_brand_name VARCHAR(255) NOT NULL,
  daraz_brand_id VARCHAR(100) NULL,
  daraz_brand_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  notes LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_brand_mapping (account_id, local_brand_name),
  KEY idx_daraz_brand_mapping_brand (daraz_brand_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- 7. PRODUCT EXTRA TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS daraz_product_attributes (
  id INT(11) NOT NULL AUTO_INCREMENT,
  product_id INT(11) NOT NULL,
  account_code VARCHAR(50) NOT NULL,
  item_id BIGINT(20) NOT NULL,
  attribute_name VARCHAR(255) NOT NULL,
  attribute_value LONGTEXT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'daraz',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_product_attribute (product_id, attribute_name),
  KEY idx_daraz_product_attributes_item (account_code, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_product_images (
  id INT(11) NOT NULL AUTO_INCREMENT,
  product_id INT(11) NOT NULL,
  account_code VARCHAR(50) NOT NULL,
  item_id BIGINT(20) NOT NULL,
  image_url TEXT NOT NULL,
  daraz_image_url TEXT NULL,
  image_type VARCHAR(50) NOT NULL DEFAULT 'gallery',
  sort_order INT(11) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  raw_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_product_images_product (product_id),
  KEY idx_daraz_product_images_item (account_code, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_sku_images (
  id INT(11) NOT NULL AUTO_INCREMENT,
  sku_db_id INT(11) NOT NULL,
  product_id INT(11) NOT NULL,
  account_code VARCHAR(50) NOT NULL,
  item_id BIGINT(20) NOT NULL,
  sku_id BIGINT(20) NULL,
  seller_sku VARCHAR(255) NULL,
  image_url TEXT NOT NULL,
  sort_order INT(11) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_sku_images_sku (sku_db_id),
  KEY idx_daraz_sku_images_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_product_qc_status (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NOT NULL,
  item_id BIGINT(20) NOT NULL,
  qc_status VARCHAR(100) NULL,
  reason LONGTEXT NULL,
  response_json LONGTEXT NULL,
  checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_qc_item (account_code, item_id),
  KEY idx_daraz_qc_status (qc_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_product_change_history (
  id INT(11) NOT NULL AUTO_INCREMENT,
  product_id INT(11) NULL,
  account_code VARCHAR(50) NOT NULL,
  item_id BIGINT(20) NOT NULL,
  change_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(255) NULL,
  old_value LONGTEXT NULL,
  new_value LONGTEXT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'sync',
  changed_by VARCHAR(150) NULL,
  raw_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_product_history_product (product_id),
  KEY idx_daraz_product_history_item (account_code, item_id),
  KEY idx_daraz_product_history_type (change_type),
  KEY idx_daraz_product_history_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- 8. INVENTORY / STOCK / PRICE
-- =========================================================

CREATE TABLE IF NOT EXISTS daraz_inventory_history (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NOT NULL,
  product_id INT(11) NULL,
  sku_db_id INT(11) NULL,
  item_id BIGINT(20) NOT NULL,
  sku_id BIGINT(20) NULL,
  seller_sku VARCHAR(255) NULL,

  old_quantity INT(11) NULL,
  new_quantity INT(11) NULL,
  old_available INT(11) NULL,
  new_available INT(11) NULL,
  old_sellable_stock INT(11) NULL,
  new_sellable_stock INT(11) NULL,
  old_price DECIMAL(10,2) NULL,
  new_price DECIMAL(10,2) NULL,
  old_special_price DECIMAL(10,2) NULL,
  new_special_price DECIMAL(10,2) NULL,

  change_type VARCHAR(50) NOT NULL DEFAULT 'sync_detected',
  reason LONGTEXT NULL,
  changed_by VARCHAR(150) NULL,
  raw_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_inventory_history_account (account_code),
  KEY idx_daraz_inventory_history_seller_sku (seller_sku),
  KEY idx_daraz_inventory_history_item (item_id),
  KEY idx_daraz_inventory_history_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_stock_update_queue (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NOT NULL,
  item_id BIGINT(20) NOT NULL,
  sku_id BIGINT(20) NULL,
  seller_sku VARCHAR(255) NULL,
  target_quantity INT(11) NULL,
  target_price DECIMAL(10,2) NULL,
  target_special_price DECIMAL(10,2) NULL,
  update_type VARCHAR(50) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'normal',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  attempts INT(11) NOT NULL DEFAULT 0,
  last_attempt_at DATETIME NULL,
  response_json LONGTEXT NULL,
  error_message LONGTEXT NULL,
  requested_by VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_stock_queue_account_status (account_code, status),
  KEY idx_daraz_stock_queue_seller_sku (seller_sku),
  KEY idx_daraz_stock_queue_priority (priority),
  KEY idx_daraz_stock_queue_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_stock_mismatch_logs (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NOT NULL,
  item_id BIGINT(20) NULL,
  sku_id BIGINT(20) NULL,
  seller_sku VARCHAR(255) NOT NULL,
  cms_stock INT(11) NULL,
  daraz_stock INT(11) NULL,
  cms_price DECIMAL(10,2) NULL,
  daraz_price DECIMAL(10,2) NULL,
  mismatch_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  fixed_at DATETIME NULL,
  notes LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_stock_mismatch_account (account_code),
  KEY idx_daraz_stock_mismatch_sku (seller_sku),
  KEY idx_daraz_stock_mismatch_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- 9. ORDERS / ORDER ITEMS / RETURNS
-- =========================================================

CREATE TABLE IF NOT EXISTS daraz_orders (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(100) NULL,

  order_id BIGINT(20) NOT NULL,
  order_number VARCHAR(100) NULL,
  order_status VARCHAR(100) NULL,
  fulfillment_type VARCHAR(100) NULL,
  payment_method VARCHAR(255) NULL,
  currency VARCHAR(10) NULL,

  customer_first_name VARCHAR(255) NULL,
  customer_last_name VARCHAR(255) NULL,
  customer_email VARCHAR(255) NULL,
  customer_phone VARCHAR(100) NULL,
  shipping_address_json LONGTEXT NULL,
  billing_address_json LONGTEXT NULL,

  order_total DECIMAL(10,2) NULL,
  shipping_fee DECIMAL(10,2) NULL,
  voucher_amount DECIMAL(10,2) NULL,
  commission_amount DECIMAL(10,2) NULL,

  tracking_code VARCHAR(255) NULL,
  shipping_provider VARCHAR(255) NULL,
  package_id VARCHAR(100) NULL,

  daraz_created_at DATETIME NULL,
  daraz_updated_at DATETIME NULL,
  last_synced_at DATETIME NULL,
  raw_json LONGTEXT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_orders_account_order (account_code, order_id),
  KEY idx_daraz_orders_account (account_id),
  KEY idx_daraz_orders_status (order_status),
  KEY idx_daraz_orders_date (daraz_created_at),
  KEY idx_daraz_orders_tracking (tracking_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_order_items (
  id INT(11) NOT NULL AUTO_INCREMENT,
  order_db_id INT(11) NOT NULL,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NOT NULL,

  order_id BIGINT(20) NOT NULL,
  order_item_id BIGINT(20) NOT NULL,
  item_id BIGINT(20) NULL,
  sku_id BIGINT(20) NULL,
  seller_sku VARCHAR(255) NULL,
  shop_sku VARCHAR(255) NULL,
  product_name TEXT NULL,
  variation VARCHAR(255) NULL,
  item_status VARCHAR(100) NULL,

  quantity INT(11) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NULL,
  paid_price DECIMAL(10,2) NULL,
  shipping_fee DECIMAL(10,2) NULL,
  voucher_amount DECIMAL(10,2) NULL,
  commission_amount DECIMAL(10,2) NULL,

  tracking_code VARCHAR(255) NULL,
  shipping_provider VARCHAR(255) NULL,
  package_id VARCHAR(100) NULL,

  raw_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_order_items_account_item (account_code, order_item_id),
  KEY idx_daraz_order_items_order (order_db_id),
  KEY idx_daraz_order_items_seller_sku (seller_sku),
  KEY idx_daraz_order_items_item_id (item_id),
  KEY idx_daraz_order_items_status (item_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_order_status_history (
  id INT(11) NOT NULL AUTO_INCREMENT,
  order_db_id INT(11) NULL,
  order_item_db_id INT(11) NULL,
  account_code VARCHAR(50) NOT NULL,
  order_id BIGINT(20) NOT NULL,
  order_item_id BIGINT(20) NULL,
  old_status VARCHAR(100) NULL,
  new_status VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'daraz_sync',
  raw_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_order_status_order (order_id),
  KEY idx_daraz_order_status_item (order_item_id),
  KEY idx_daraz_order_status_new (new_status),
  KEY idx_daraz_order_status_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_returns_refunds (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NOT NULL,
  order_id BIGINT(20) NULL,
  order_item_id BIGINT(20) NULL,
  return_id VARCHAR(100) NULL,
  refund_id VARCHAR(100) NULL,
  seller_sku VARCHAR(255) NULL,
  reason LONGTEXT NULL,
  status VARCHAR(100) NULL,
  refund_amount DECIMAL(10,2) NULL,
  currency VARCHAR(10) NULL,
  requested_at DATETIME NULL,
  completed_at DATETIME NULL,
  raw_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_returns_account (account_code),
  KEY idx_daraz_returns_order (order_id),
  KEY idx_daraz_returns_item (order_item_id),
  KEY idx_daraz_returns_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- 10. FINANCE
-- =========================================================

CREATE TABLE IF NOT EXISTS daraz_finance_transactions (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(150) NULL,
  order_id BIGINT(20) NULL,
  order_item_id BIGINT(20) NULL,
  seller_sku VARCHAR(255) NULL,
  transaction_type VARCHAR(150) NULL,
  fee_type VARCHAR(150) NULL,
  description LONGTEXT NULL,
  amount DECIMAL(10,2) NULL,
  currency VARCHAR(10) NULL,
  transaction_date DATETIME NULL,
  raw_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_finance_transaction (account_code, transaction_id),
  KEY idx_daraz_finance_account (account_code),
  KEY idx_daraz_finance_order (order_id),
  KEY idx_daraz_finance_type (transaction_type, fee_type),
  KEY idx_daraz_finance_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- 11. IMAGE ASSETS / UPLOAD MANAGEMENT
-- Does NOT touch your existing product_images table.
-- =========================================================

CREATE TABLE IF NOT EXISTS daraz_image_assets (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NULL,
  source_type VARCHAR(50) NOT NULL DEFAULT 'external_url',
  source_url TEXT NULL,
  local_path TEXT NULL,
  daraz_url TEXT NULL,
  image_hash VARCHAR(255) NULL,
  width INT(11) NULL,
  height INT(11) NULL,
  file_size_bytes BIGINT(20) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  response_json LONGTEXT NULL,
  error_message LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_image_assets_account (account_code),
  KEY idx_daraz_image_assets_hash (image_hash),
  KEY idx_daraz_image_assets_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- 12. PRODUCT UPLOAD / VALIDATION / QUEUE
-- =========================================================

CREATE TABLE IF NOT EXISTS daraz_product_upload_queue (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NOT NULL,
  source_type VARCHAR(50) NOT NULL DEFAULT 'cms',
  source_product_id VARCHAR(150) NULL,
  target_item_id BIGINT(20) NULL,
  operation VARCHAR(50) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  validation_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  validation_errors_json LONGTEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  attempts INT(11) NOT NULL DEFAULT 0,
  response_json LONGTEXT NULL,
  error_message LONGTEXT NULL,
  requested_by VARCHAR(150) NULL,
  processed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_upload_queue_account_status (account_code, status),
  KEY idx_daraz_upload_queue_source (source_type, source_product_id),
  KEY idx_daraz_upload_queue_operation (operation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_product_validation_rules (
  id INT(11) NOT NULL AUTO_INCREMENT,
  country_code VARCHAR(10) NOT NULL DEFAULT 'LK',
  category_id BIGINT(20) NULL,
  rule_key VARCHAR(150) NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  rule_config_json LONGTEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_validation_rule (country_code, category_id, rule_key),
  KEY idx_daraz_validation_rule_type (rule_type),
  KEY idx_daraz_validation_rule_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- 13. SKU MAPPING / TRANSFER
-- =========================================================

CREATE TABLE IF NOT EXISTS daraz_sku_mapping (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NOT NULL,
  daraz_item_id BIGINT(20) NULL,
  daraz_sku_id BIGINT(20) NULL,
  daraz_seller_sku VARCHAR(255) NULL,
  cms_product_id VARCHAR(150) NULL,
  cms_sku VARCHAR(255) NULL,
  woo_product_id VARCHAR(150) NULL,
  woo_variation_id VARCHAR(150) NULL,
  woo_sku VARCHAR(255) NULL,
  mapping_status VARCHAR(50) NOT NULL DEFAULT 'active',
  notes LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_sku_mapping_account_sku (account_code, daraz_seller_sku),
  KEY idx_daraz_sku_mapping_cms_sku (cms_sku),
  KEY idx_daraz_sku_mapping_woo_sku (woo_sku),
  KEY idx_daraz_sku_mapping_status (mapping_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_transfer_batches (
  id INT(11) NOT NULL AUTO_INCREMENT,
  batch_code VARCHAR(100) NOT NULL,
  transfer_type VARCHAR(50) NOT NULL,
  source_account_id INT(11) NULL,
  source_account_code VARCHAR(50) NULL,
  target_account_id INT(11) NULL,
  target_account_code VARCHAR(50) NULL,
  total_items INT(11) NOT NULL DEFAULT 0,
  success_items INT(11) NOT NULL DEFAULT 0,
  failed_items INT(11) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  requested_by VARCHAR(150) NULL,
  notes LONGTEXT NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daraz_transfer_batch_code (batch_code),
  KEY idx_daraz_transfer_batch_type (transfer_type),
  KEY idx_daraz_transfer_batch_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_transfer_items (
  id INT(11) NOT NULL AUTO_INCREMENT,
  batch_id INT(11) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_product_id VARCHAR(150) NULL,
  source_item_id BIGINT(20) NULL,
  source_sku VARCHAR(255) NULL,
  target_account_code VARCHAR(50) NULL,
  target_item_id BIGINT(20) NULL,
  target_sku VARCHAR(255) NULL,
  category_mapping_id INT(11) NULL,
  brand_mapping_id INT(11) NULL,
  payload_json LONGTEXT NULL,
  validation_errors_json LONGTEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  response_json LONGTEXT NULL,
  error_message LONGTEXT NULL,
  processed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_transfer_items_batch (batch_id),
  KEY idx_daraz_transfer_items_source (source_type, source_product_id),
  KEY idx_daraz_transfer_items_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- 14. BUSINESS RULES
-- =========================================================

CREATE TABLE IF NOT EXISTS daraz_pricing_rules (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NULL,
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  rule_config_json LONGTEXT NOT NULL,
  priority INT(11) NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_pricing_rules_account (account_code),
  KEY idx_daraz_pricing_rules_type (rule_type),
  KEY idx_daraz_pricing_rules_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daraz_listing_rules (
  id INT(11) NOT NULL AUTO_INCREMENT,
  account_id INT(11) NULL,
  account_code VARCHAR(50) NULL,
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  rule_config_json LONGTEXT NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'warning',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_listing_rules_account (account_code),
  KEY idx_daraz_listing_rules_type (rule_type),
  KEY idx_daraz_listing_rules_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- 15. DASHBOARD VIEWS
-- =========================================================

CREATE OR REPLACE VIEW vw_daraz_product_summary AS
SELECT
  p.account_code,
  p.account_name,
  COUNT(DISTINCT p.id) AS total_products,
  COUNT(DISTINCT p.item_id) AS total_item_ids,
  COUNT(DISTINCT s.id) AS total_skus,
  SUM(CASE WHEN p.status IS NOT NULL AND LOWER(p.status) LIKE '%active%' THEN 1 ELSE 0 END) AS active_products,
  SUM(CASE WHEN COALESCE(s.quantity, 0) <= 0 THEN 1 ELSE 0 END) AS oos_skus,
  MIN(p.last_synced_at) AS oldest_sync,
  MAX(p.last_synced_at) AS latest_sync
FROM daraz_products p
LEFT JOIN daraz_skus s ON s.product_id = p.id
GROUP BY p.account_code, p.account_name;

CREATE OR REPLACE VIEW vw_daraz_inventory_oos AS
SELECT
  p.account_code,
  p.account_name,
  p.item_id,
  p.name AS product_name,
  s.sku_id,
  s.seller_sku,
  s.shop_sku,
  s.price,
  s.special_price,
  s.quantity,
  s.available,
  s.sellable_stock,
  s.sku_status,
  p.last_synced_at
FROM daraz_products p
JOIN daraz_skus s ON s.product_id = p.id
WHERE COALESCE(s.quantity, 0) <= 0
   OR COALESCE(s.available, 0) <= 0
   OR COALESCE(s.sellable_stock, 0) <= 0;

CREATE OR REPLACE VIEW vw_daraz_order_summary AS
SELECT
  account_code,
  account_name,
  DATE(daraz_created_at) AS order_date,
  order_status,
  COUNT(*) AS total_orders,
  SUM(COALESCE(order_total, 0)) AS total_order_value,
  SUM(COALESCE(shipping_fee, 0)) AS total_shipping_fee,
  SUM(COALESCE(commission_amount, 0)) AS total_commission
FROM daraz_orders
GROUP BY account_code, account_name, DATE(daraz_created_at), order_status;

-- =========================================================
-- 16. DEFAULT BUSINESS RULE EXAMPLES
-- =========================================================

INSERT INTO daraz_listing_rules
(account_code, rule_name, rule_type, rule_config_json, severity, is_active, created_by)
SELECT NULL, 'Default Product Title Required', 'title', '{"required": true, "min_length": 10, "max_length": 255}', 'error', 1, 'system'
WHERE NOT EXISTS (
  SELECT 1 FROM daraz_listing_rules WHERE rule_name = 'Default Product Title Required'
);

INSERT INTO daraz_listing_rules
(account_code, rule_name, rule_type, rule_config_json, severity, is_active, created_by)
SELECT NULL, 'Default Product Image Required', 'image', '{"main_image_required": true, "min_images": 1}', 'error', 1, 'system'
WHERE NOT EXISTS (
  SELECT 1 FROM daraz_listing_rules WHERE rule_name = 'Default Product Image Required'
);

INSERT INTO daraz_pricing_rules
(account_code, rule_name, rule_type, rule_config_json, priority, is_active, created_by)
SELECT NULL, 'Default Minimum Price Check', 'min_price', '{"min_price": 1, "currency": "LKR"}', 100, 1, 'system'
WHERE NOT EXISTS (
  SELECT 1 FROM daraz_pricing_rules WHERE rule_name = 'Default Minimum Price Check'
);

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- END SAFE UPDATE
-- =========================================================

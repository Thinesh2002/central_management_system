-- =========================================================
-- SAFE ADVANCED DARAZ SELLER CENTRAL UPDATE
-- Target database: product_management
-- Does NOT drop or empty existing data.
-- Adds missing Daraz/account/inventory/finance automation support.
-- =========================================================

USE product_management;

DELIMITER $$
DROP PROCEDURE IF EXISTS add_col_if_missing $$
CREATE PROCEDURE add_col_if_missing(IN p_table VARCHAR(128), IN p_col VARCHAR(128), IN p_def TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_def);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$
DELIMITER ;

-- ---------------------------------------------------------
-- daraz_accounts compatibility with old table structure
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS daraz_accounts (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_code VARCHAR(100) NULL UNIQUE,
  account_name VARCHAR(100) NULL,
  app_key VARCHAR(100) NULL,
  app_secret VARCHAR(255) NULL,
  access_token TEXT NULL,
  refresh_token TEXT NULL,
  api_base VARCHAR(255) NULL DEFAULT 'https://api.daraz.lk/rest',
  token_status VARCHAR(50) NULL DEFAULT 'UNKNOWN',
  token_message TEXT NULL,
  seller_name VARCHAR(255) NULL,
  token_updated_at DATETIME NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CALL add_col_if_missing('daraz_accounts','seller_id','VARCHAR(100) NULL');
CALL add_col_if_missing('daraz_accounts','user_id','VARCHAR(100) NULL');
CALL add_col_if_missing('daraz_accounts','country_code','VARCHAR(10) NULL DEFAULT ''LK''');
CALL add_col_if_missing('daraz_accounts','marketplace','VARCHAR(50) NULL DEFAULT ''daraz_lk''');
CALL add_col_if_missing('daraz_accounts','api_base_url','VARCHAR(255) NULL DEFAULT ''https://api.daraz.lk/rest''');
CALL add_col_if_missing('daraz_accounts','app_secret_encrypted','TEXT NULL');
CALL add_col_if_missing('daraz_accounts','access_token_expires_at','DATETIME NULL');
CALL add_col_if_missing('daraz_accounts','refresh_token_expires_at','DATETIME NULL');
CALL add_col_if_missing('daraz_accounts','last_token_refresh_at','DATETIME NULL');
CALL add_col_if_missing('daraz_accounts','sync_status','VARCHAR(50) NOT NULL DEFAULT ''active''');
CALL add_col_if_missing('daraz_accounts','last_product_sync_at','DATETIME NULL');
CALL add_col_if_missing('daraz_accounts','last_order_sync_at','DATETIME NULL');
CALL add_col_if_missing('daraz_accounts','last_inventory_sync_at','DATETIME NULL');
CALL add_col_if_missing('daraz_accounts','last_category_sync_at','DATETIME NULL');
CALL add_col_if_missing('daraz_accounts','notes','TEXT NULL');
CALL add_col_if_missing('daraz_accounts','updated_at','TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

UPDATE daraz_accounts
SET api_base_url = COALESCE(api_base_url, api_base, 'https://api.daraz.lk/rest'),
    api_base = COALESCE(api_base, api_base_url, 'https://api.daraz.lk/rest'),
    app_secret_encrypted = COALESCE(app_secret_encrypted, app_secret),
    seller_name = COALESCE(seller_name, account_name),
    sync_status = COALESCE(sync_status, 'active')
WHERE id IS NOT NULL;

-- ---------------------------------------------------------
-- Daraz stock and sync feature tables
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS daraz_token_logs (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id INT NULL,
  account_code VARCHAR(100) NULL,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  old_access_token_expires_at DATETIME NULL,
  new_access_token_expires_at DATETIME NULL,
  old_refresh_token_expires_at DATETIME NULL,
  new_refresh_token_expires_at DATETIME NULL,
  message TEXT NULL,
  error_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX(account_code), INDEX(action,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daraz_api_logs (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id INT NULL,
  account_code VARCHAR(100) NULL,
  api_path VARCHAR(255) NOT NULL,
  http_method VARCHAR(20) DEFAULT 'GET',
  request_params_json LONGTEXT NULL,
  request_body_json LONGTEXT NULL,
  response_code VARCHAR(50) NULL,
  response_json LONGTEXT NULL,
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT NULL,
  duration_ms INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX(account_code), INDEX(api_path), INDEX(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daraz_stock_update_queue (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id INT NULL,
  account_code VARCHAR(100) NOT NULL,
  item_id BIGINT NULL,
  sku_id BIGINT NULL,
  seller_sku VARCHAR(255) NULL,
  target_quantity INT NULL,
  target_price DECIMAL(12,2) NULL,
  target_special_price DECIMAL(12,2) NULL,
  update_type VARCHAR(50) NOT NULL DEFAULT 'stock',
  priority VARCHAR(50) NOT NULL DEFAULT 'normal',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_attempt_at DATETIME NULL,
  response_json LONGTEXT NULL,
  error_message TEXT NULL,
  requested_by VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX(account_code,status), INDEX(seller_sku), INDEX(priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daraz_inventory_history (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id INT NULL,
  account_code VARCHAR(100) NOT NULL,
  product_id INT NULL,
  sku_db_id INT NULL,
  item_id BIGINT NULL,
  sku_id BIGINT NULL,
  seller_sku VARCHAR(255) NULL,
  old_quantity INT NULL,
  new_quantity INT NULL,
  old_price DECIMAL(12,2) NULL,
  new_price DECIMAL(12,2) NULL,
  old_special_price DECIMAL(12,2) NULL,
  new_special_price DECIMAL(12,2) NULL,
  change_type VARCHAR(50) DEFAULT 'sync_detected',
  reason TEXT NULL,
  changed_by VARCHAR(150) NULL,
  raw_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX(account_code), INDEX(seller_sku), INDEX(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------
-- Local product/inventory tables if your database does not have them yet
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  parent_sku VARCHAR(255) NOT NULL UNIQUE,
  product_name TEXT NULL,
  sub_category_code VARCHAR(100) NULL,
  brand VARCHAR(255) NULL,
  description LONGTEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_variations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  parent_sku VARCHAR(255) NOT NULL,
  sku VARCHAR(255) NOT NULL UNIQUE,
  color VARCHAR(100) NULL,
  size VARCHAR(100) NULL,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status TINYINT DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX(parent_sku), INDEX(sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(255) NOT NULL UNIQUE,
  total_stock INT NOT NULL DEFAULT 0,
  reserved_stock INT NOT NULL DEFAULT 0,
  available_stock INT NOT NULL DEFAULT 0,
  last_updated DATETIME NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX(sku), INDEX(available_stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP PROCEDURE IF EXISTS add_col_if_missing;

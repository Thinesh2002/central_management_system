-- =========================================================
-- PRODUCT MANAGEMENT + DARAZ ENTERPRISE PATCH
-- Safe for existing product_management database.
-- Does not drop or empty any existing table.
-- Run this in phpMyAdmin before testing the upgraded frontend.
-- =========================================================

USE product_management;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id INT NOT NULL AUTO_INCREMENT,
  category_code VARCHAR(50) NOT NULL,
  category_name VARCHAR(150) NOT NULL,
  created_by VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categories_code (category_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  KEY idx_sub_categories_category (category_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  UNIQUE KEY uk_products_parent_sku (parent_sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  UNIQUE KEY uk_inventory_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  KEY idx_inventory_history_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  UNIQUE KEY uk_daraz_sku_mapping_account_sku (account_code, daraz_seller_sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  UNIQUE KEY uk_daraz_category_mapping_safe (account_code, local_category_code, local_sub_category_code, daraz_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  UNIQUE KEY uk_user_feature_permissions (user_id, role_name, feature_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  UNIQUE KEY uk_user_bookmark (user_id, feature_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO daraz_pack_rules (pack_size, pack_code, pack_label, sku_suffix, multiplier) VALUES
(1, '1PK', 'Single Pack', '1PK', 1),
(2, '2PK', '2 Pack', '2PK', 2),
(3, '3PK', '3 Pack', '3PK', 3),
(4, '4PK', '4 Pack', '4PK', 4),
(5, '5PK', '5 Pack', '5PK', 5),
(10, '10PK', '10 Pack', '10PK', 10)
ON DUPLICATE KEY UPDATE pack_code = VALUES(pack_code), pack_label = VALUES(pack_label), sku_suffix = VALUES(sku_suffix), multiplier = VALUES(multiplier);

-- For older MariaDB versions that do not support ADD COLUMN IF NOT EXISTS,
-- the backend now also runs an automatic schema bootstrap on startup.
-- =========================================================

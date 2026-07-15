-- =====================================================================
-- 30_price_rules_patch.sql
-- Phase 2, final piece: Price Rule Engine. Computes a SUGGESTED selling
-- price per marketplace (local/daraz/woocommerce) from cost + margin +
-- rounding rule - it never overwrites a manually-set price. Suggestions
-- are recomputed only when a SKU's cost_price actually changes (i.e. on
-- a GRN receipt), not retroactively when a rule is created/edited.
--
-- Delegable via Access Control, page_key "price_rules".
--
-- Run this after 29_grn_patch.sql.
-- =====================================================================

USE cm_price_management;

CREATE TABLE IF NOT EXISTS price_rules (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(150) NOT NULL,
  category_id       BIGINT UNSIGNED NULL,
  marketplace       ENUM('local', 'daraz', 'woocommerce', 'all') NOT NULL DEFAULT 'all',
  margin_type       ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  margin_value      DECIMAL(12, 2) NOT NULL,
  rounding_rule     ENUM('none', 'nearest_9', 'nearest_50', 'nearest_100', 'nearest_whole') NOT NULL DEFAULT 'none',
  min_price         DECIMAL(12, 2) NULL,
  max_price         DECIMAL(12, 2) NULL,
  priority          INT NOT NULL DEFAULT 0,
  status            ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_by        BIGINT UNSIGNED NULL,
  updated_by        BIGINT UNSIGNED NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP NULL DEFAULT NULL,

  KEY idx_price_rules_category (category_id),
  KEY idx_price_rules_marketplace (marketplace),
  KEY idx_price_rules_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS add_column_if_missing;

CREATE PROCEDURE add_column_if_missing(
  IN db_name VARCHAR(128),
  IN table_name_value VARCHAR(128),
  IN column_name_value VARCHAR(128),
  IN alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = db_name
      AND TABLE_NAME = table_name_value
      AND COLUMN_NAME = column_name_value
  ) THEN
    SET @stmt = alter_sql;
    PREPARE prepared_stmt FROM @stmt;
    EXECUTE prepared_stmt;
    DEALLOCATE PREPARE prepared_stmt;
  END IF;
END;

CALL add_column_if_missing(
  'cm_price_management', 'product_prices', 'suggested_sale_price',
  'ALTER TABLE cm_price_management.product_prices ADD COLUMN suggested_sale_price DECIMAL(12,2) NULL AFTER sale_price'
);

CALL add_column_if_missing(
  'cm_price_management', 'product_prices', 'suggested_daraz_price',
  'ALTER TABLE cm_price_management.product_prices ADD COLUMN suggested_daraz_price DECIMAL(12,2) NULL AFTER daraz_price'
);

CALL add_column_if_missing(
  'cm_price_management', 'product_prices', 'suggested_woo_price',
  'ALTER TABLE cm_price_management.product_prices ADD COLUMN suggested_woo_price DECIMAL(12,2) NULL AFTER woo_price'
);

CALL add_column_if_missing(
  'cm_price_management', 'product_prices', 'suggested_at',
  'ALTER TABLE cm_price_management.product_prices ADD COLUMN suggested_at TIMESTAMP NULL DEFAULT NULL'
);

DROP PROCEDURE IF EXISTS add_column_if_missing;

USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('price_rules', 'Price Rules', '/price-rules', 'SlidersHorizontal', 8, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

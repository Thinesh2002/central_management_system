-- =====================================================================
-- 07_daraz_inventory_core_patch.sql
-- Daraz + Inventory core patch for existing servers.
-- Run this after 01 to 06 database setup files.
-- =====================================================================

USE cm_product_management;

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

DROP PROCEDURE IF EXISTS add_index_if_missing;

CREATE PROCEDURE add_index_if_missing(
  IN db_name VARCHAR(128),
  IN table_name_value VARCHAR(128),
  IN index_name_value VARCHAR(128),
  IN alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = db_name
      AND TABLE_NAME = table_name_value
      AND INDEX_NAME = index_name_value
  ) THEN
    SET @stmt = alter_sql;
    PREPARE prepared_stmt FROM @stmt;
    EXECUTE prepared_stmt;
    DEALLOCATE PREPARE prepared_stmt;
  END IF;
END;

CALL add_column_if_missing(
  'cm_product_management',
  'daraz_products',
  'local_product_id',
  'ALTER TABLE cm_product_management.daraz_products ADD COLUMN local_product_id BIGINT UNSIGNED NULL AFTER account_id'
);

CALL add_column_if_missing(
  'cm_product_management',
  'daraz_products',
  'local_variant_id',
  'ALTER TABLE cm_product_management.daraz_products ADD COLUMN local_variant_id BIGINT UNSIGNED NULL AFTER local_product_id'
);

CREATE TEMPORARY TABLE tmp_daraz_product_keep AS
SELECT MIN(id) AS keep_id
FROM daraz_products
WHERE daraz_item_id IS NOT NULL
GROUP BY account_id, daraz_item_id;

DELETE dp
FROM daraz_products dp
LEFT JOIN tmp_daraz_product_keep k ON k.keep_id = dp.id
WHERE dp.daraz_item_id IS NOT NULL
  AND k.keep_id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_daraz_product_keep;

CREATE TEMPORARY TABLE tmp_daraz_product_sku_keep AS
SELECT MIN(id) AS keep_id
FROM daraz_products
WHERE seller_sku IS NOT NULL
GROUP BY account_id, seller_sku;

DELETE dp
FROM daraz_products dp
LEFT JOIN tmp_daraz_product_sku_keep k ON k.keep_id = dp.id
WHERE dp.seller_sku IS NOT NULL
  AND k.keep_id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_daraz_product_sku_keep;

CALL add_index_if_missing(
  'cm_product_management',
  'daraz_products',
  'uq_daraz_products_account_item',
  'ALTER TABLE cm_product_management.daraz_products ADD UNIQUE KEY uq_daraz_products_account_item (account_id, daraz_item_id)'
);

CALL add_index_if_missing(
  'cm_product_management',
  'daraz_products',
  'uq_daraz_products_account_sku',
  'ALTER TABLE cm_product_management.daraz_products ADD UNIQUE KEY uq_daraz_products_account_sku (account_id, seller_sku)'
);

CREATE TEMPORARY TABLE tmp_daraz_variant_sku_keep AS
SELECT MIN(id) AS keep_id
FROM daraz_product_variants
WHERE seller_sku IS NOT NULL
GROUP BY account_id, seller_sku;

DELETE dv
FROM daraz_product_variants dv
LEFT JOIN tmp_daraz_variant_sku_keep k ON k.keep_id = dv.id
WHERE dv.seller_sku IS NOT NULL
  AND k.keep_id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_daraz_variant_sku_keep;

CALL add_index_if_missing(
  'cm_product_management',
  'daraz_product_variants',
  'uq_daraz_variants_account_sku',
  'ALTER TABLE cm_product_management.daraz_product_variants ADD UNIQUE KEY uq_daraz_variants_account_sku (account_id, seller_sku)'
);

USE cm_logs_management;

CREATE TABLE IF NOT EXISTS daraz_inventory_sync_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_uid VARCHAR(120) NULL,
  account_id BIGINT UNSIGNED NULL,
  account_code VARCHAR(80) NULL,
  seller_sku VARCHAR(120) NOT NULL,
  daraz_item_id VARCHAR(80) NULL,
  daraz_sku_id VARCHAR(80) NULL,
  old_quantity INT NULL,
  new_quantity INT NOT NULL DEFAULT 0,
  source VARCHAR(80) NOT NULL DEFAULT 'inventory_update',
  sync_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  message TEXT NULL,
  error_code VARCHAR(80) NULL,
  error_message TEXT NULL,
  request_id VARCHAR(120) NULL,
  trace_id VARCHAR(120) NULL,
  changed_by BIGINT UNSIGNED NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_daraz_inventory_sync_logs_job (job_uid),
  KEY idx_daraz_inventory_sync_logs_sku (seller_sku),
  KEY idx_daraz_inventory_sync_logs_account (account_id),
  KEY idx_daraz_inventory_sync_logs_status (sync_status),
  KEY idx_daraz_inventory_sync_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

USE cm_product_management;
DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;

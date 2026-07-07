-- =====================================================================
-- 09_product_variants_name_patch.sql
-- Adds product_variants.variant_name for existing servers.
-- Run this after 01 to 08 database setup files.
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

CALL add_column_if_missing(
  'cm_product_management',
  'product_variants',
  'variant_name',
  'ALTER TABLE cm_product_management.product_variants ADD COLUMN variant_name VARCHAR(200) NULL AFTER variant_sku'
);

DROP PROCEDURE IF EXISTS add_column_if_missing;

-- =====================================================================
-- 10_daraz_transfer_patch.sql
-- Adds Daraz category/brand/attribute columns to products so a chosen
-- category + attribute set can be saved and reused on future transfers.
-- Run this after 01 to 09 database setup files.
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
  'products',
  'daraz_category_id',
  'ALTER TABLE cm_product_management.products ADD COLUMN daraz_category_id BIGINT UNSIGNED NULL AFTER model_id'
);

CALL add_column_if_missing(
  'cm_product_management',
  'products',
  'daraz_category_name',
  'ALTER TABLE cm_product_management.products ADD COLUMN daraz_category_name VARCHAR(255) NULL AFTER daraz_category_id'
);

CALL add_column_if_missing(
  'cm_product_management',
  'products',
  'daraz_brand',
  'ALTER TABLE cm_product_management.products ADD COLUMN daraz_brand VARCHAR(150) NULL AFTER daraz_category_name'
);

CALL add_column_if_missing(
  'cm_product_management',
  'products',
  'daraz_attributes_json',
  'ALTER TABLE cm_product_management.products ADD COLUMN daraz_attributes_json JSON NULL AFTER daraz_brand'
);

DROP PROCEDURE IF EXISTS add_column_if_missing;

-- =====================================================================
-- 46_model_code_scoped_unique_patch.sql
-- Model codes were globally unique (uq_product_models_code), so the same
-- model_code could never be reused under a different category/sub
-- category even though that's a completely valid, expected setup (e.g.
-- "PD" for "Pole Duster" under Cleaning Supplies AND under a different
-- category). Rescopes uniqueness to (category_id, sub_category_id,
-- model_code) instead.
--
-- Run this after 45_brighthub_rename_website_products_patch.sql.
-- =====================================================================

USE cm_product_management;

DROP PROCEDURE IF EXISTS drop_key_if_exists;
DROP PROCEDURE IF EXISTS add_key_if_missing;

CREATE PROCEDURE drop_key_if_exists(
  IN db_name VARCHAR(128),
  IN table_name_value VARCHAR(128),
  IN key_name_value VARCHAR(128)
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = db_name
      AND TABLE_NAME = table_name_value
      AND INDEX_NAME = key_name_value
  ) THEN
    SET @stmt = CONCAT('ALTER TABLE ', db_name, '.', table_name_value, ' DROP INDEX ', key_name_value);
    PREPARE prepared_stmt FROM @stmt;
    EXECUTE prepared_stmt;
    DEALLOCATE PREPARE prepared_stmt;
  END IF;
END;

CREATE PROCEDURE add_key_if_missing(
  IN db_name VARCHAR(128),
  IN table_name_value VARCHAR(128),
  IN key_name_value VARCHAR(128),
  IN alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = db_name
      AND TABLE_NAME = table_name_value
      AND INDEX_NAME = key_name_value
  ) THEN
    SET @stmt = alter_sql;
    PREPARE prepared_stmt FROM @stmt;
    EXECUTE prepared_stmt;
    DEALLOCATE PREPARE prepared_stmt;
  END IF;
END;

CALL drop_key_if_exists('cm_product_management', 'product_models', 'uq_product_models_code');

CALL add_key_if_missing(
  'cm_product_management',
  'product_models',
  'uq_product_models_category_sub_code',
  'ALTER TABLE cm_product_management.product_models ADD UNIQUE KEY uq_product_models_category_sub_code (category_id, sub_category_id, model_code)'
);

DROP PROCEDURE IF EXISTS drop_key_if_exists;
DROP PROCEDURE IF EXISTS add_key_if_missing;

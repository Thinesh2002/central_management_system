-- =====================================================================
-- 23_manual_order_enhancements_patch.sql
-- Manual order create page: adds a buyer-facing shipping charge separate
-- from the actual shipping cost, and a courier name for the local-order
-- waybill flow (Track My Order button uses this).
-- Run this after 01 to 22 database setup files.
-- =====================================================================

USE cm_order_management;

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
  'cm_order_management',
  'orders',
  'buyer_pays_shipping',
  'ALTER TABLE cm_order_management.orders ADD COLUMN buyer_pays_shipping DECIMAL(12,2) NULL DEFAULT 0'
);

CALL add_column_if_missing(
  'cm_order_management',
  'orders',
  'courier_name',
  'ALTER TABLE cm_order_management.orders ADD COLUMN courier_name VARCHAR(100) NULL'
);

DROP PROCEDURE IF EXISTS add_column_if_missing;

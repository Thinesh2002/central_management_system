-- =====================================================================
-- 24_manual_order_waybill_columns_patch.sql
-- The local orders table never had waybill_id/tracking_number columns -
-- every "Add Waybill" save for a manual order was silently dropped by
-- pickAllowedData (which only writes columns that actually exist).
-- Run this after 01 to 23 database setup files.
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
  'waybill_id',
  'ALTER TABLE cm_order_management.orders ADD COLUMN waybill_id VARCHAR(100) NULL'
);

CALL add_column_if_missing(
  'cm_order_management',
  'orders',
  'tracking_number',
  'ALTER TABLE cm_order_management.orders ADD COLUMN tracking_number VARCHAR(100) NULL'
);

DROP PROCEDURE IF EXISTS add_column_if_missing;

-- =====================================================================
-- 28_supplier_bank_details_patch.sql
-- Adds bank name + account number to suppliers, for paying suppliers
-- directly against a purchase order without leaving the app.
--
-- Run this after 27_purchase_orders_patch.sql.
-- =====================================================================

USE cm_supplier_management;

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
  'cm_supplier_management',
  'suppliers',
  'bank_name',
  'ALTER TABLE cm_supplier_management.suppliers ADD COLUMN bank_name VARCHAR(150) NULL AFTER business_registration_no'
);

CALL add_column_if_missing(
  'cm_supplier_management',
  'suppliers',
  'bank_account_number',
  'ALTER TABLE cm_supplier_management.suppliers ADD COLUMN bank_account_number VARCHAR(50) NULL AFTER bank_name'
);

DROP PROCEDURE IF EXISTS add_column_if_missing;

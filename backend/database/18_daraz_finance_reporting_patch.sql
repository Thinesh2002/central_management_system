-- =====================================================================
-- 18_daraz_finance_reporting_patch.sql
-- Daraz's transaction_date comes back as free text (e.g. "17 May 2016"),
-- which can't be reliably filtered/sorted by SQL date range. This adds a
-- real parsed DATE column, populated at upsert time, so the Finance page
-- can offer Last 7/30/90 days, This Month, Last Month filters.
--
-- Run this after 01 to 17 database setup files.
-- =====================================================================

USE cm_finance_management;

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
  'cm_finance_management',
  'daraz_finance_transactions',
  'transaction_date_parsed',
  'ALTER TABLE cm_finance_management.daraz_finance_transactions ADD COLUMN transaction_date_parsed DATE NULL AFTER transaction_date, ADD KEY idx_finance_txn_date_parsed (transaction_date_parsed)'
);

DROP PROCEDURE IF EXISTS add_column_if_missing;

-- =====================================================================
-- 21_daraz_title_optimizer_logs_reviewer_patch.sql
-- Adds daraz_title_optimizer_logs.reviewed_by so the Logs Management
-- page can show who approved a title change, not just when.
--
-- Run this after 01 to 20 database setup files.
-- =====================================================================

USE cm_logs_management;

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
  'cm_logs_management',
  'daraz_title_optimizer_logs',
  'reviewed_by',
  'ALTER TABLE cm_logs_management.daraz_title_optimizer_logs ADD COLUMN reviewed_by BIGINT UNSIGNED NULL AFTER account_id'
);

DROP PROCEDURE IF EXISTS add_column_if_missing;

-- =====================================================================
-- 20_daraz_title_optimizer_logs_patch.sql
-- Audit trail for the Daraz Title Optimizer: one row per scan batch
-- (how many products scanned/succeeded/failed) and one row per title
-- actually applied to Daraz (old title -> new title), so activity is
-- visible on the Logs Management page.
--
-- Lives in cm_logs_management alongside the app's other audit tables.
--
-- Run this after 01 to 19 database setup files.
-- =====================================================================

USE cm_logs_management;

CREATE TABLE IF NOT EXISTS daraz_title_optimizer_logs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type      VARCHAR(20)  NOT NULL,
  account_id      BIGINT UNSIGNED NULL,
  scan_batch_id   VARCHAR(60)  NULL,
  suggestion_id   BIGINT UNSIGNED NULL,
  seller_sku      VARCHAR(80)  NULL,
  old_title       VARCHAR(255) NULL,
  new_title       VARCHAR(255) NULL,
  total           INT NULL,
  succeeded       INT NULL,
  failed          INT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'success',
  message         TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_title_opt_logs_event (event_type),
  KEY idx_title_opt_logs_account (account_id),
  KEY idx_title_opt_logs_batch (scan_batch_id),
  KEY idx_title_opt_logs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

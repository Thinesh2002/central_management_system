-- =====================================================================
-- 33_woo_inventory_sync_patch.sql
-- Phase 4: WooCommerce push capability, stock side. Mirrors
-- daraz_inventory_sync_logs' shape (same database) - GRN receipts now
-- push stock to WooCommerce the same way they already push to Daraz.
--
-- Run this after 32_daraz_price_reconciliation_patch.sql.
-- =====================================================================

USE cm_logs_management;

CREATE TABLE IF NOT EXISTS woo_inventory_sync_logs (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_uid           VARCHAR(120) NULL,
  account_id        BIGINT UNSIGNED NULL,
  account_code      VARCHAR(80) NULL,
  sku               VARCHAR(120) NOT NULL,
  woo_product_id    VARCHAR(80) NULL,
  woo_variation_id  VARCHAR(80) NULL,
  old_quantity      INT NULL,
  new_quantity      INT NOT NULL DEFAULT 0,
  source            VARCHAR(80) NOT NULL DEFAULT 'inventory_update',
  sync_status       VARCHAR(40) NOT NULL DEFAULT 'pending',
  message           TEXT NULL,
  error_code        VARCHAR(80) NULL,
  error_message     TEXT NULL,
  changed_by        BIGINT UNSIGNED NULL,
  started_at        DATETIME NULL,
  finished_at       DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_woo_inventory_sync_logs_job (job_uid),
  KEY idx_woo_inventory_sync_logs_sku (sku),
  KEY idx_woo_inventory_sync_logs_account (account_id),
  KEY idx_woo_inventory_sync_logs_status (sync_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

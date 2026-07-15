-- =====================================================================
-- 32_daraz_price_reconciliation_patch.sql
-- Phase 4, first piece: nightly Daraz price reconciliation. Compares
-- cm_price_management.product_prices.daraz_price (our target) against
-- the live-price cache in cm_product_management.daraz_products /
-- daraz_product_variants (kept fresh by the existing 30-minute product
-- sync job) and pushes a correction only when they actually differ -
-- stock already gets an unconditional push every 30 minutes via the
-- existing DARAZ_INVENTORY_SYNC_JOB, so this patch is price-only.
--
-- Mirrors daraz_inventory_sync_logs' shape (same database) but with
-- old_price/new_price instead of quantity columns.
--
-- Run this after 31_approval_center_patch.sql.
-- =====================================================================

USE cm_logs_management;

CREATE TABLE IF NOT EXISTS daraz_price_reconciliation_logs (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_uid           VARCHAR(120) NULL,
  account_id        BIGINT UNSIGNED NULL,
  account_code      VARCHAR(80) NULL,
  seller_sku        VARCHAR(120) NOT NULL,
  daraz_item_id     VARCHAR(80) NULL,
  daraz_sku_id      VARCHAR(80) NULL,
  old_price         DECIMAL(12, 2) NULL,
  new_price         DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  source            VARCHAR(80) NOT NULL DEFAULT 'price_reconciliation',
  sync_status       VARCHAR(40) NOT NULL DEFAULT 'pending',
  message           TEXT NULL,
  error_code        VARCHAR(80) NULL,
  error_message     TEXT NULL,
  request_id        VARCHAR(120) NULL,
  trace_id          VARCHAR(120) NULL,
  changed_by        BIGINT UNSIGNED NULL,
  started_at        DATETIME NULL,
  finished_at       DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_daraz_price_reconciliation_job (job_uid),
  KEY idx_daraz_price_reconciliation_sku (seller_sku),
  KEY idx_daraz_price_reconciliation_account (account_id),
  KEY idx_daraz_price_reconciliation_status (sync_status),
  KEY idx_daraz_price_reconciliation_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

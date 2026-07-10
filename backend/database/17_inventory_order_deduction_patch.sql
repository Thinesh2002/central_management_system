-- =====================================================================
-- 17_inventory_order_deduction_patch.sql
-- Auto-deduct local inventory stock when a NEW Daraz order item is
-- synced in for the first time (idempotent — only on first sight of an
-- order item, never on re-sync/status-change updates). Every attempt
-- (success or "SKU not found in local inventory") is logged.
--
-- inventory_logs goes into the existing cm_logs_management database
-- alongside the app's other audit-trail tables.
--
-- Run this after 01 to 16 database setup files.
-- =====================================================================

USE cm_logs_management;

CREATE TABLE IF NOT EXISTS inventory_logs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source          VARCHAR(20)  NOT NULL DEFAULT 'daraz',
  source_order_id VARCHAR(60)  NULL,
  order_item_id   VARCHAR(60)  NULL,
  sku             VARCHAR(150) NULL,
  qty             INT NULL,
  old_stock_qty   INT NULL,
  new_stock_qty   INT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'success',
  message         TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_inventory_logs_sku (sku),
  KEY idx_inventory_logs_source_order (source, source_order_id),
  KEY idx_inventory_logs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

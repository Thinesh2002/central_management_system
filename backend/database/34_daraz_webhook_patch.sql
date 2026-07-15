-- =====================================================================
-- 34_daraz_webhook_patch.sql
-- Phase 4, part 3: webhook-driven order sync. Every inbound POST to the
-- webhook receiver is logged here regardless of outcome (even if
-- signature verification or parsing fails) - the 30-minute polling job
-- keeps running unchanged as a safety net, this is additive.
--
-- Run this after 33_woo_inventory_sync_patch.sql.
-- =====================================================================

USE cm_logs_management;

CREATE TABLE IF NOT EXISTS daraz_webhook_logs (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  topic             VARCHAR(120) NULL,
  msg_id            VARCHAR(120) NULL,
  seller_id         VARCHAR(80) NULL,
  order_id          VARCHAR(80) NULL,
  account_id        BIGINT UNSIGNED NULL,
  signature_valid   TINYINT(1) NULL,
  status            VARCHAR(40) NOT NULL DEFAULT 'received',
  message           TEXT NULL,
  raw_body          TEXT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_daraz_webhook_logs_order (order_id),
  KEY idx_daraz_webhook_logs_account (account_id),
  KEY idx_daraz_webhook_logs_status (status),
  KEY idx_daraz_webhook_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

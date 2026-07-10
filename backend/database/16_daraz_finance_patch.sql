-- =====================================================================
-- 16_daraz_finance_patch.sql
-- Daraz Finance sync: GetPayoutStatus (auto every 6h) and
-- QueryTransactionDetails (auto every 1h + manual sync button).
--
-- daraz_finance_payouts / daraz_finance_transactions live in their own
-- new database, cm_finance_management.
-- daraz_finance_sync_logs (sync run history: success/failure, counts)
-- goes into the existing cm_logs_management database alongside the
-- app's other audit-trail tables.
--
-- Run this after 01 to 15 database setup files.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS cm_finance_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cm_finance_management;

CREATE TABLE IF NOT EXISTS daraz_finance_payouts (
  id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id             BIGINT UNSIGNED NOT NULL,
  statement_number       VARCHAR(100) NOT NULL,
  opening_balance        DECIMAL(14,2) NULL,
  closing_balance        DECIMAL(14,2) NULL,
  payout                 VARCHAR(60)   NULL,
  paid                   DECIMAL(14,2) NULL,
  item_revenue           DECIMAL(14,2) NULL,
  other_revenue_total    DECIMAL(14,2) NULL,
  fees_total             DECIMAL(14,2) NULL,
  fees_on_refunds_total  DECIMAL(14,2) NULL,
  refunds                DECIMAL(14,2) NULL,
  guarantee_deposit      DECIMAL(14,2) NULL,
  subtotal1              DECIMAL(14,2) NULL,
  subtotal2               DECIMAL(14,2) NULL,
  shipment_fee            DECIMAL(14,2) NULL,
  shipment_fee_credit     DECIMAL(14,2) NULL,
  daraz_created_at        DATETIME NULL,
  daraz_updated_at        DATETIME NULL,
  raw_json                JSON NULL,
  created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_finance_payout_account_statement (account_id, statement_number),
  KEY idx_finance_payouts_account (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daraz_finance_transactions (
  id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id             BIGINT UNSIGNED NOT NULL,
  transaction_number     VARCHAR(100) NOT NULL,
  order_no               VARCHAR(60)  NULL,
  order_item_no          VARCHAR(60)  NULL,
  transaction_date       VARCHAR(60)  NULL,
  amount                 DECIMAL(14,4) NULL,
  paid_status            VARCHAR(40)  NULL,
  shipping_provider      VARCHAR(60)  NULL,
  wht_included_in_amount VARCHAR(10)  NULL,
  wht_amount             DECIMAL(14,4) NULL,
  vat_in_amount          DECIMAL(14,4) NULL,
  payment_ref_id         VARCHAR(100) NULL,
  seller_sku             VARCHAR(150) NULL,
  lazada_sku              VARCHAR(150) NULL,
  fee_type                VARCHAR(40)  NULL,
  fee_name                VARCHAR(150) NULL,
  transaction_type        VARCHAR(60)  NULL,
  order_item_status       VARCHAR(60)  NULL,
  reference                VARCHAR(100) NULL,
  shipping_speed           VARCHAR(60)  NULL,
  statement                 VARCHAR(150) NULL,
  details                    TEXT NULL,
  comment                    TEXT NULL,
  shipment_type               VARCHAR(60) NULL,
  raw_json                     JSON NULL,
  created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_finance_txn_account_number (account_id, transaction_number),
  KEY idx_finance_txn_account (account_id),
  KEY idx_finance_txn_order (order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- daraz_finance_sync_logs (sync run history) — cm_logs_management, next
-- to this app's other *_logs / *_sync_runs tables.
-- ---------------------------------------------------------------------
USE cm_logs_management;

CREATE TABLE IF NOT EXISTS daraz_finance_sync_logs (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id     BIGINT UNSIGNED NOT NULL,
  sync_scope     VARCHAR(20) NOT NULL,
  sync_type      VARCHAR(20) NOT NULL DEFAULT 'auto',
  status         VARCHAR(20) NOT NULL DEFAULT 'running',
  total_found    INT UNSIGNED NULL,
  total_saved    INT UNSIGNED NULL,
  error_message  TEXT NULL,
  started_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at    TIMESTAMP NULL,

  KEY idx_finance_sync_logs_account (account_id),
  KEY idx_finance_sync_logs_scope (sync_scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Register the page so Access Control can manage per-user permissions
-- for it, same as every other menu entry.
USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('daraz_finance', 'Daraz Finance', '/order-management/finance', 'DollarSign', 146, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

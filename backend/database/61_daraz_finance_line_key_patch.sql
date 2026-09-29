-- =====================================================================
-- 61_daraz_finance_line_key_patch.sql
-- Fixes Daraz finance transaction lines silently overwriting each other.
--
-- QueryTransactionDetails returns one row per fee line, but every line of
-- an order item shares the same transaction_number (e.g. one number
-- carries Product Price Paid by Buyer, Commission Fee, Payment Fee,
-- Shipping Fee ...). The old unique key (account_id, transaction_number)
-- made each upsert overwrite the previous line, so only the last fee per
-- order survived - commission and product price were never stored.
-- Verified 2026-09-29: 388 API lines for one account/month collapsed to
-- 89 stored rows; (transaction_number, orderItem_no, fee_type) is unique
-- across all 388.
--
-- This adds line_key = transaction_number|orderItem_no|fee_type, unique
-- per account, and drops the old key. Existing rows keep their data;
-- the next sync/backfill inserts the missing lines beside them.
--
-- Also stores QueryAccountTransactions wallet movements and registers the
-- finance app's "Daraz Income" page for Access Control.
--
-- Additive + idempotent. Run with:
--   node scripts/run-sql-file.js 61_daraz_finance_line_key_patch.sql
-- =====================================================================

USE cm_finance_management;

CREATE TABLE IF NOT EXISTS daraz_finance_account_transactions (
  id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id                BIGINT UNSIGNED NOT NULL,
  transaction_number        VARCHAR(100) NOT NULL,
  transaction_time          VARCHAR(60) NULL,
  transaction_time_parsed   DATETIME NULL,
  transaction_type          VARCHAR(30) NULL,
  sub_transaction_type      VARCHAR(80) NULL,
  amount                    DECIMAL(14,4) NULL,
  currency                  VARCHAR(10) NULL,
  pmt_reference             VARCHAR(150) NULL,
  payee_account             VARCHAR(150) NULL,
  payee_description         VARCHAR(255) NULL,
  remarks                   TEXT NULL,
  tracking_json             JSON NULL,
  raw_json                  JSON NULL,
  created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_daraz_account_txn (account_id, transaction_number),
  KEY idx_daraz_account_txn_time (transaction_time_parsed),
  KEY idx_daraz_account_txn_type (transaction_type, sub_transaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS run_if;

CREATE PROCEDURE run_if(IN should_run TINYINT, IN alter_sql TEXT)
BEGIN
  IF should_run = 1 THEN
    SET @stmt = alter_sql;
    PREPARE prepared_stmt FROM @stmt;
    EXECUTE prepared_stmt;
    DEALLOCATE PREPARE prepared_stmt;
  END IF;
END;

-- 1. line_key column
CALL run_if(
  (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = 'cm_finance_management' AND TABLE_NAME = 'daraz_finance_transactions' AND COLUMN_NAME = 'line_key'),
  'ALTER TABLE daraz_finance_transactions ADD COLUMN line_key VARCHAR(255) NULL AFTER transaction_number'
);

-- 2. fill it for rows stored before this patch (same format the model writes)
UPDATE daraz_finance_transactions
SET line_key = CONCAT(transaction_number, '|', COALESCE(order_item_no, ''), '|', COALESCE(fee_type, ''))
WHERE line_key IS NULL;

-- 3. new unique key per line
CALL run_if(
  (SELECT COUNT(*) = 0 FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = 'cm_finance_management' AND TABLE_NAME = 'daraz_finance_transactions' AND INDEX_NAME = 'uniq_finance_txn_account_line'),
  'ALTER TABLE daraz_finance_transactions ADD UNIQUE KEY uniq_finance_txn_account_line (account_id, line_key)'
);

-- 4. drop the old per-transaction-number key that caused the overwrites
CALL run_if(
  (SELECT COUNT(*) > 0 FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = 'cm_finance_management' AND TABLE_NAME = 'daraz_finance_transactions' AND INDEX_NAME = 'uniq_finance_txn_account_number'),
  'ALTER TABLE daraz_finance_transactions DROP INDEX uniq_finance_txn_account_number'
);

-- 5. lookup/report indexes
CALL run_if(
  (SELECT COUNT(*) = 0 FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = 'cm_finance_management' AND TABLE_NAME = 'daraz_finance_transactions' AND INDEX_NAME = 'idx_finance_txn_number'),
  'ALTER TABLE daraz_finance_transactions ADD KEY idx_finance_txn_number (account_id, transaction_number)'
);

CALL run_if(
  (SELECT COUNT(*) = 0 FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = 'cm_finance_management' AND TABLE_NAME = 'daraz_finance_transactions' AND INDEX_NAME = 'idx_finance_txn_fee_type'),
  'ALTER TABLE daraz_finance_transactions ADD KEY idx_finance_txn_fee_type (fee_type)'
);

DROP PROCEDURE IF EXISTS run_if;

USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('finance_daraz', 'Finance Daraz Income', '/finance/daraz', 'Receipt', 302, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name), route_path = VALUES(route_path);

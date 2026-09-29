-- =====================================================================
-- 60_finance_ledger_patch.sql
-- Finance app (finance.teckvora.com): a manual income/expense ledger
-- that sits beside the Daraz payout/transaction data already synced into
-- cm_finance_management, so the Finance Dashboard can show a full
-- profit & loss picture (order revenue - marketplace fees + other
-- income - expenses).
--
-- Additive only: two new tables, default categories, and two new
-- app_pages rows so Access Control can grant the finance pages
-- per-user. Existing users pick up default (role-based) permission rows
-- on next backend restart via ensureAllUserPermissions().
--
-- Run with: node scripts/run-sql-file.js 60_finance_ledger_patch.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS cm_finance_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cm_finance_management;

CREATE TABLE IF NOT EXISTS finance_categories (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  entry_type   ENUM('income', 'expense') NOT NULL,
  description  VARCHAR(255) NULL,
  status       ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_by   BIGINT UNSIGNED NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_finance_category_type_name (entry_type, name),
  KEY idx_finance_category_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_entries (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_type      ENUM('income', 'expense') NOT NULL,
  category_id     BIGINT UNSIGNED NULL,
  entry_date      DATE NOT NULL,
  amount          DECIMAL(14,2) NOT NULL,
  payment_method  VARCHAR(60)  NULL,
  reference       VARCHAR(120) NULL,
  description     TEXT NULL,
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  deleted_at      DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_finance_entries_date (entry_date),
  KEY idx_finance_entries_type_date (entry_type, entry_date),
  KEY idx_finance_entries_category (category_id),
  KEY idx_finance_entries_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO finance_categories (name, entry_type, description) VALUES
  ('Stock Purchases',      'expense', 'Inventory bought from suppliers'),
  ('Advertising',          'expense', 'Daraz sponsored, Facebook, Google ads'),
  ('Courier & Delivery',   'expense', 'Courier charges not deducted by a marketplace'),
  ('Packaging',            'expense', 'Boxes, bags, tape, labels'),
  ('Salaries',             'expense', 'Staff salaries and wages'),
  ('Rent',                 'expense', 'Office / warehouse rent'),
  ('Utilities',            'expense', 'Electricity, water, internet, phone'),
  ('Software & Hosting',   'expense', 'VPS, domains, subscriptions'),
  ('Bank Charges',         'expense', 'Bank and payment gateway fees'),
  ('Other Expense',        'expense', NULL),
  ('Direct Sales',         'income',  'Cash/bank sales not recorded as orders'),
  ('Marketplace Incentives','income', 'Campaign rebates, incentives'),
  ('Owner Investment',     'income',  'Capital introduced'),
  ('Other Income',         'income',  NULL);

-- Page registration for Access Control. The main system sidebar is
-- hardcoded (Sidebar.jsx), so these rows only appear in Access Control;
-- the finance app itself checks them via /api/finance/access.
USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('finance_dashboard', 'Finance Dashboard', '/finance/dashboard', 'LineChart', 300, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name), route_path = VALUES(route_path);

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('finance_ledger', 'Finance Ledger', '/finance/ledger', 'BookOpen', 301, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name), route_path = VALUES(route_path);

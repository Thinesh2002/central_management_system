-- =====================================================================
-- 03_inventory_management.sql
-- Database: cm_inventory_management
-- Stock is tracked by SKU (not numeric product id), since SKU is the
-- system-wide identifier shared across listing, order and finance.
-- =====================================================================

USE cm_inventory_management;

-- ---------------------------------------------------------------------
-- product_inventory (current stock snapshot per SKU)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_inventory (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku                   VARCHAR(80) NOT NULL,
  stock_qty             INT NOT NULL DEFAULT 0,
  reserved_qty          INT NOT NULL DEFAULT 0,
  available_qty         INT NOT NULL DEFAULT 0,
  low_stock_alert_qty   INT NOT NULL DEFAULT 5,
  warehouse_location    VARCHAR(120) NULL,
  created_by            BIGINT UNSIGNED NULL,
  updated_by            BIGINT UNSIGNED NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at            TIMESTAMP NULL DEFAULT NULL,

  UNIQUE KEY uq_product_inventory_sku (sku),
  KEY idx_product_inventory_deleted (deleted_at),
  KEY idx_product_inventory_low_stock (stock_qty, low_stock_alert_qty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- stock_ledger (full audit trail of every stock change, per SKU)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_ledger (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku               VARCHAR(80) NOT NULL,
  change_qty        INT NOT NULL,
  balance_qty       INT NOT NULL,
  change_type       ENUM('manual_adjustment', 'order_deduct', 'order_restore', 'sync_correction', 'initial_stock') NOT NULL DEFAULT 'manual_adjustment',
  reference_type    VARCHAR(60) NULL,
  reference_id      VARCHAR(80) NULL,
  reason            VARCHAR(255) NULL,
  created_by        BIGINT UNSIGNED NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_stock_ledger_sku (sku),
  KEY idx_stock_ledger_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 04_price_management.sql
-- Database: cm_price_management
--
-- One row per SKU. This is the single source of truth for:
--   cost_price            -> what you paid for the item
--   sale_price            -> your local store selling price
--   local_selling_price   -> displayed local selling price (POS/front)
--   daraz_price           -> price pushed to Daraz listings
--   woo_price             -> price pushed to WooCommerce listings
--   profit_percent        -> calculated profit margin
--   daraz_fee_percent / advertising_percent / packing_percent
--                         -> cost components used by the profit calculator
-- =====================================================================

USE cm_price_management;

CREATE TABLE IF NOT EXISTS product_prices (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku                     VARCHAR(80)  NOT NULL,
  product_name            VARCHAR(200) NULL,
  colour_name             VARCHAR(100) NULL,
  image_url               VARCHAR(500) NULL,

  cost_price              DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  sale_price              DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  local_selling_price     DECIMAL(12, 2) NULL,
  daraz_price             DECIMAL(12, 2) NULL,
  woo_price               DECIMAL(12, 2) NULL,

  profit_percent          DECIMAL(6, 2) NULL,
  daraz_fee_percent       DECIMAL(6, 2) NULL,
  advertising_percent     DECIMAL(6, 2) NULL,
  packing_percent         DECIMAL(6, 2) NULL,

  currency                VARCHAR(10) NOT NULL DEFAULT 'LKR',
  status                  ENUM('active', 'inactive') NOT NULL DEFAULT 'active',

  created_by              BIGINT UNSIGNED NULL,
  updated_by              BIGINT UNSIGNED NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at              TIMESTAMP NULL DEFAULT NULL,

  UNIQUE KEY uq_product_prices_sku (sku),
  KEY idx_product_prices_status (status),
  KEY idx_product_prices_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- price_history (audit trail every time a price is changed)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_history (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku             VARCHAR(80) NOT NULL,
  field_name      VARCHAR(60) NOT NULL,
  old_value       DECIMAL(12, 2) NULL,
  new_value       DECIMAL(12, 2) NULL,
  changed_by      BIGINT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_price_history_sku (sku),
  KEY idx_price_history_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

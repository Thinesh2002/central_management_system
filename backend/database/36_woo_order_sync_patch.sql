-- =====================================================================
-- 36_woo_order_sync_patch.sql
-- Phase 4, last piece: WooCommerce order sync. Mirrors the real,
-- live daraz_orders/daraz_order_items schema (introspected via
-- SHOW CREATE TABLE - not checked into git) column-for-column where
-- WooCommerce has an equivalent, adapted to the WooCommerce REST API
-- v3 order object shape. Lives in cm_order_management, same as the
-- Daraz order tables.
--
-- Already wired into order_model.js's generic multi-source query layer
-- (SOURCES.woo) and the frontend's order source filter - both were
-- built ahead of this table existing, so no other code changes are
-- needed to make these orders show up in the unified Orders page.
--
-- Run this after 35_sidebar_page_registration_patch.sql.
-- =====================================================================

USE cm_order_management;

CREATE TABLE IF NOT EXISTS woo_orders (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id          BIGINT UNSIGNED NOT NULL,
  account_code        VARCHAR(80) NULL,
  account_name        VARCHAR(190) NULL,
  customer_id         BIGINT UNSIGNED NULL,
  woo_order_id        VARCHAR(120) NOT NULL,
  order_number        VARCHAR(120) NULL,
  order_status        VARCHAR(100) NOT NULL,
  payment_method      VARCHAR(120) NULL,
  order_date          DATETIME NULL,
  created_time        DATETIME NULL,
  updated_time        DATETIME NULL,
  item_total          DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  discount_total      DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  shipping_fee        DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  grand_total         DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  currency            VARCHAR(10) NOT NULL DEFAULT 'LKR',
  buyer_name          VARCHAR(190) NULL,
  buyer_phone         VARCHAR(80) NULL,
  buyer_email         VARCHAR(190) NULL,
  shipping_name       VARCHAR(190) NULL,
  shipping_address    TEXT NULL,
  shipping_city       VARCHAR(120) NULL,
  shipping_region     VARCHAR(120) NULL,
  raw_payload         JSON NULL,
  last_synced_at      DATETIME NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_woo_order_account (account_id, woo_order_id),
  KEY idx_woo_orders_customer_id (customer_id),
  KEY idx_woo_orders_status (order_status),
  KEY idx_woo_orders_date (order_date),
  KEY idx_woo_orders_account (account_id),
  KEY idx_woo_orders_order_number (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS woo_order_items (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  woo_order_id        BIGINT UNSIGNED NOT NULL,
  woo_line_item_id    VARCHAR(120) NULL,
  product_id          BIGINT UNSIGNED NULL,
  seller_sku          VARCHAR(190) NULL,
  local_sku           VARCHAR(190) NULL,
  product_title       VARCHAR(255) NULL,
  variation_name      VARCHAR(190) NULL,
  product_image_url   TEXT NULL,
  qty                 INT NOT NULL DEFAULT 1,
  unit_price          DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount     DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  line_total          DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  item_status         VARCHAR(100) NULL,
  stock_deducted      TINYINT(1) NOT NULL DEFAULT 0,
  stock_deducted_at   DATETIME NULL,
  raw_payload         JSON NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_woo_order_item (woo_order_id, woo_line_item_id),
  KEY idx_woo_items_order_id (woo_order_id),
  KEY idx_woo_items_sku (seller_sku),
  KEY idx_woo_items_local_sku (local_sku),
  CONSTRAINT fk_woo_order_items_order_id FOREIGN KEY (woo_order_id) REFERENCES woo_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

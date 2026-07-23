-- =====================================================================
-- 44_brighthub_integration_patch.sql
-- Adds BrightHub (the user's own e-commerce website, admin.brighthub.lk)
-- as a marketplace platform, mirroring the WooCommerce integration:
-- a `platforms` row, a `brighthub_products` sync table, and a sidebar
-- page registration. Product sync only (no orders/customers) per scope.
-- =====================================================================

USE cm_marketplace_management;

INSERT INTO platforms (platform_code, platform_name, status)
VALUES ('BRIGHTHUB', 'BrightHub', 'active')
ON DUPLICATE KEY UPDATE platform_name = VALUES(platform_name);

USE cm_product_management;

CREATE TABLE IF NOT EXISTS brighthub_products (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id          BIGINT UNSIGNED NOT NULL,
  bhid                VARCHAR(60)  NOT NULL,
  source_product_id   BIGINT UNSIGNED NULL,
  sku                 VARCHAR(120) NULL,
  name                VARCHAR(255) NULL,
  price               DECIMAL(12,2) NULL,
  category_id         BIGINT UNSIGNED NULL,
  status              VARCHAR(40) NULL,
  images_json         LONGTEXT NULL,
  variant_attributes_json LONGTEXT NULL,
  raw_json            LONGTEXT NULL,
  last_synced_at      DATETIME NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_brighthub_products_account_bhid (account_id, bhid),
  KEY idx_brighthub_products_account (account_id),
  KEY idx_brighthub_products_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('brighthub_products', 'BrightHub Products', '/product/brighthub-products', 'Store', 148, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name), route_path = VALUES(route_path);

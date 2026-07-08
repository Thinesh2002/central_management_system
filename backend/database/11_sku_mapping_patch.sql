-- =====================================================================
-- 11_sku_mapping_patch.sql
-- SKU Mapping: corrects a wrong SKU seen on a marketplace (e.g. a typo'd
-- Daraz seller_sku) to the real local SKU, so reports/sync can resolve it.
-- Run this after 01 to 10 database setup files.
-- =====================================================================

USE cm_product_management;

CREATE TABLE IF NOT EXISTS sku_mappings (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wrong_sku     VARCHAR(120) NOT NULL,
  correct_sku   VARCHAR(120) NOT NULL,
  platform      VARCHAR(40)  NULL DEFAULT 'DARAZ',
  notes         VARCHAR(500) NULL,
  created_by    BIGINT UNSIGNED NULL,
  updated_by    BIGINT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_sku_mappings_wrong_sku (wrong_sku),
  KEY idx_sku_mappings_correct_sku (correct_sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Register the page so the Access Control screen can manage per-user
-- permissions for it, same as every other menu entry.
USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('sku_mapping', 'SKU Mapping', '/product/sku-mapping', 'PackageSearch', 27, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

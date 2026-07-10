-- =====================================================================
-- 19_daraz_title_optimizer_patch.sql
-- AI-assisted Daraz product title optimization: bulk-scan existing
-- Daraz listings, generate a suggested title via Claude, hold it in a
-- review queue until a human approves/rejects — never auto-published.
--
-- Lives in cm_product_management, next to daraz_products.
--
-- Run this after 01 to 18 database setup files.
-- =====================================================================

USE cm_product_management;

CREATE TABLE IF NOT EXISTS daraz_title_suggestions (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id         BIGINT UNSIGNED NOT NULL,
  daraz_product_id   BIGINT UNSIGNED NOT NULL,
  daraz_item_id      VARCHAR(80) NULL,
  seller_sku         VARCHAR(80) NULL,
  original_title     VARCHAR(255) NULL,
  suggested_title    VARCHAR(255) NULL,
  reasoning          TEXT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'pending',
  scan_batch_id      VARCHAR(60) NULL,
  applied_at         DATETIME NULL,
  error_message      TEXT NULL,
  created_by         BIGINT UNSIGNED NULL,
  reviewed_by        BIGINT UNSIGNED NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_title_suggestions_account (account_id),
  KEY idx_title_suggestions_status (status),
  KEY idx_title_suggestions_product (daraz_product_id),
  KEY idx_title_suggestions_batch (scan_batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Register the sidebar page so Access Control can manage per-user
-- permissions for it, same as every other menu entry.
USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('daraz_title_optimizer', 'Title Optimizer', '/product/daraz-products/title-optimizer', 'Sparkles', 31, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

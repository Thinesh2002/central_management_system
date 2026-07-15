-- =====================================================================
-- 25_daraz_content_optimizer_patch.sql
-- AI Content Optimization module: bulk-analyzes existing Daraz listings
-- (highlights, description, keywords, feature extraction, attribute
-- validation, content scoring, recommendations, publishing readiness)
-- and holds AI-generated content in a review queue until a human
-- approves/applies it - same review-before-apply model as the Title
-- Optimizer. Title suggestions themselves stay in the existing
-- daraz_title_suggestions table (referenced here via FK) rather than
-- being duplicated.
--
-- Lives in cm_product_management, next to daraz_products and
-- daraz_title_suggestions.
--
-- Run this after 01 to 24 database setup files.
-- =====================================================================

USE cm_product_management;

CREATE TABLE IF NOT EXISTS daraz_content_suggestions (
  id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id                  BIGINT UNSIGNED NOT NULL,
  daraz_product_id            BIGINT UNSIGNED NOT NULL,
  daraz_item_id               VARCHAR(80) NULL,
  seller_sku                  VARCHAR(80) NULL,
  title_suggestion_id         BIGINT UNSIGNED NULL,

  original_highlights_json    JSON NULL,
  suggested_highlights_json   JSON NULL,
  highlights_reasoning        TEXT NULL,

  original_description        TEXT NULL,
  suggested_description        TEXT NULL,
  suggested_description_html  MEDIUMTEXT NULL,
  description_sections_json   JSON NULL,

  extracted_features_json     JSON NULL,
  keyword_suggestions_json    JSON NULL,
  attribute_validation_json   JSON NULL,

  scores_json                 JSON NULL,
  recommendations_json        JSON NULL,

  publishing_checklist_json   JSON NULL,
  readiness_percent           TINYINT UNSIGNED NULL,

  status                      VARCHAR(20) NOT NULL DEFAULT 'pending',
  scan_batch_id                VARCHAR(60) NULL,
  applied_at                  DATETIME NULL,
  error_message                TEXT NULL,
  created_by                  BIGINT UNSIGNED NULL,
  reviewed_by                 BIGINT UNSIGNED NULL,
  created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_content_suggestions_account (account_id),
  KEY idx_content_suggestions_status (status),
  KEY idx_content_suggestions_product (daraz_product_id),
  KEY idx_content_suggestions_batch (scan_batch_id),
  KEY idx_content_suggestions_title_ref (title_suggestion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Register the sidebar page so Access Control can manage per-user
-- permissions for it, same as every other menu entry.
USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('ai_content_optimizer', 'AI Content Optimizer', '/product/daraz-products/content-optimizer', 'Sparkles', 32, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

-- Audit trail: one row per scan batch and one row per applied content
-- change, mirroring daraz_title_optimizer_logs so activity is visible
-- on the Logs Management page.
USE cm_logs_management;

CREATE TABLE IF NOT EXISTS daraz_content_optimizer_logs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type      VARCHAR(20)  NOT NULL,
  account_id      BIGINT UNSIGNED NULL,
  scan_batch_id   VARCHAR(60)  NULL,
  suggestion_id   BIGINT UNSIGNED NULL,
  reviewed_by     BIGINT UNSIGNED NULL,
  seller_sku      VARCHAR(80)  NULL,
  section         VARCHAR(20)  NULL,
  total           INT NULL,
  succeeded       INT NULL,
  failed          INT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'success',
  message         TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_content_opt_logs_event (event_type),
  KEY idx_content_opt_logs_account (account_id),
  KEY idx_content_opt_logs_batch (scan_batch_id),
  KEY idx_content_opt_logs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

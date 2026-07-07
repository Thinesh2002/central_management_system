-- =====================================================================
-- 06_logs_management.sql
-- Database: cm_logs_management
-- Login logs, system activity logs, product change logs.
-- =====================================================================

USE cm_logs_management;

-- ---------------------------------------------------------------------
-- login_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_logs (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             BIGINT UNSIGNED NULL,
  login_user_id       VARCHAR(64) NULL,
  email               VARCHAR(190) NULL,
  login_identifier    VARCHAR(190) NOT NULL DEFAULT 'unknown',
  action              VARCHAR(60) NOT NULL DEFAULT 'login_attempt',
  status              VARCHAR(30) NOT NULL DEFAULT 'failed',
  failure_reason      VARCHAR(255) NULL,
  message             VARCHAR(255) NULL,
  ip_address          VARCHAR(64) NULL,
  user_agent          VARCHAR(500) NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_login_logs_user (user_id),
  KEY idx_login_logs_created (created_at),
  KEY idx_login_logs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- system_logs (general user activity / audit trail)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NULL,
  user_uid      VARCHAR(64) NULL,
  user_email    VARCHAR(190) NULL,
  action        VARCHAR(120) NOT NULL,
  module        VARCHAR(80) NOT NULL DEFAULT 'system',
  status        VARCHAR(30) NOT NULL DEFAULT 'success',
  message       VARCHAR(500) NULL,
  ip_address    VARCHAR(64) NULL,
  user_agent    VARCHAR(500) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_system_logs_user (user_id),
  KEY idx_system_logs_module (module),
  KEY idx_system_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- product_logs (create/update/delete audit trail for products/variants)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_logs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  action          VARCHAR(60) NOT NULL,
  action_type     VARCHAR(60) NULL,
  table_name      VARCHAR(80) NULL,
  module_name     VARCHAR(80) NULL,
  record_id       BIGINT UNSIGNED NULL,
  product_id      BIGINT UNSIGNED NULL,
  variant_id      BIGINT UNSIGNED NULL,
  sku             VARCHAR(80) NULL,
  variant_sku     VARCHAR(80) NULL,
  field_name      VARCHAR(80) NULL,
  old_value       TEXT NULL,
  new_value       TEXT NULL,
  before_data     JSON NULL,
  after_data      JSON NULL,
  old_data        JSON NULL,
  new_data        JSON NULL,
  message         VARCHAR(500) NULL,
  changed_by      BIGINT UNSIGNED NULL,
  user_id         BIGINT UNSIGNED NULL,
  ip_address      VARCHAR(64) NULL,
  user_agent      VARCHAR(500) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_product_logs_product (product_id),
  KEY idx_product_logs_variant (variant_id),
  KEY idx_product_logs_sku (sku),
  KEY idx_product_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- product_image_logs (create/update/delete audit trail for images)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_image_logs (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  action            VARCHAR(60) NOT NULL,
  product_id        BIGINT UNSIGNED NULL,
  variant_id        BIGINT UNSIGNED NULL,
  image_id          BIGINT UNSIGNED NULL,
  sku               VARCHAR(80) NULL,
  variant_sku       VARCHAR(80) NULL,
  old_image_url     VARCHAR(500) NULL,
  new_image_url     VARCHAR(500) NULL,
  message           VARCHAR(500) NULL,
  changed_by        BIGINT UNSIGNED NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_product_image_logs_product (product_id),
  KEY idx_product_image_logs_variant (variant_id),
  KEY idx_product_image_logs_sku (sku),
  KEY idx_product_image_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- daraz_inventory_sync_logs (stock push audit trail to Daraz)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daraz_inventory_sync_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_uid VARCHAR(120) NULL,
  account_id BIGINT UNSIGNED NULL,
  account_code VARCHAR(80) NULL,
  seller_sku VARCHAR(120) NOT NULL,
  daraz_item_id VARCHAR(80) NULL,
  daraz_sku_id VARCHAR(80) NULL,
  old_quantity INT NULL,
  new_quantity INT NOT NULL DEFAULT 0,
  source VARCHAR(80) NOT NULL DEFAULT 'inventory_update',
  sync_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  message TEXT NULL,
  error_code VARCHAR(80) NULL,
  error_message TEXT NULL,
  request_id VARCHAR(120) NULL,
  trace_id VARCHAR(120) NULL,
  changed_by BIGINT UNSIGNED NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_daraz_inventory_sync_logs_job (job_uid),
  KEY idx_daraz_inventory_sync_logs_sku (seller_sku),
  KEY idx_daraz_inventory_sync_logs_account (account_id),
  KEY idx_daraz_inventory_sync_logs_status (sync_status),
  KEY idx_daraz_inventory_sync_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

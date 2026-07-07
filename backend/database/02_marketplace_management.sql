-- =====================================================================
-- 05_marketplace_management.sql
-- Database: cm_marketplace_management
-- Marketplace accounts (multiple Daraz / WooCommerce accounts),
-- credentials, sync jobs, API logs, and marketplace product mirrors.
-- =====================================================================

USE cm_marketplace_management;

-- ---------------------------------------------------------------------
-- platforms
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platforms (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  platform_code   VARCHAR(30)  NOT NULL,
  platform_name   VARCHAR(100) NOT NULL,
  status          ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_platforms_code (platform_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO platforms (platform_code, platform_name, status) VALUES
('DARAZ', 'Daraz', 'active'),
('WOO',   'WooCommerce', 'active')
ON DUPLICATE KEY UPDATE platform_name = VALUES(platform_name);

-- ---------------------------------------------------------------------
-- accounts (supports multiple Daraz / Woo accounts side by side)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_uid         VARCHAR(64)  NOT NULL,
  platform_id         BIGINT UNSIGNED NOT NULL,
  account_name        VARCHAR(150) NOT NULL,
  account_code        VARCHAR(60)  NULL,
  country_code        VARCHAR(10)  NOT NULL DEFAULT 'LK',
  seller_id           VARCHAR(120) NULL,
  seller_email        VARCHAR(190) NULL,
  store_url           VARCHAR(255) NULL,
  api_base_url        VARCHAR(255) NULL,
  is_sandbox          TINYINT(1) NOT NULL DEFAULT 0,
  status              VARCHAR(40) NOT NULL DEFAULT 'active',
  connection_status   VARCHAR(40) NOT NULL DEFAULT 'not_connected',
  last_error          TEXT NULL,
  last_connected_at   DATETIME NULL,
  last_sync_at        DATETIME NULL,
  created_by          BIGINT UNSIGNED NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_accounts_uid (account_uid),
  KEY idx_accounts_platform (platform_id),
  KEY idx_accounts_status (status),

  CONSTRAINT fk_accounts_platform
    FOREIGN KEY (platform_id) REFERENCES platforms (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- account_credentials (API keys / OAuth tokens per account)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_credentials (
  id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id                  BIGINT UNSIGNED NOT NULL,
  credential_type             VARCHAR(40) NOT NULL DEFAULT 'daraz_oauth',

  app_key                     VARCHAR(255) NULL,
  app_secret                  VARCHAR(255) NULL,
  access_token                TEXT NULL,
  refresh_token               TEXT NULL,

  consumer_key                VARCHAR(255) NULL,
  consumer_secret              VARCHAR(255) NULL,

  access_token_expires_at     DATETIME NULL,
  refresh_token_expires_at    DATETIME NULL,
  token_status                VARCHAR(40) NOT NULL DEFAULT 'not_created',
  last_refreshed_at           DATETIME NULL,
  last_validated_at           DATETIME NULL,
  credentials_version         INT UNSIGNED NOT NULL DEFAULT 1,

  created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_account_credentials_account_type (account_id, credential_type),
  KEY idx_account_credentials_account (account_id),

  CONSTRAINT fk_account_credentials_account
    FOREIGN KEY (account_id) REFERENCES accounts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- account_health (live connection / token health per account)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_health (
  id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id                  BIGINT UNSIGNED NOT NULL,
  platform_code               VARCHAR(30) NOT NULL,
  connection_status           VARCHAR(40) NOT NULL DEFAULT 'not_connected',
  token_status                VARCHAR(40) NOT NULL DEFAULT 'not_created',
  last_error                  TEXT NULL,
  last_product_sync_at        DATETIME NULL,
  last_inventory_sync_at      DATETIME NULL,
  error_count_today           INT UNSIGNED NOT NULL DEFAULT 0,
  success_count_today         INT UNSIGNED NOT NULL DEFAULT 0,
  last_checked_at             DATETIME NULL,
  created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_account_health_account (account_id),

  CONSTRAINT fk_account_health_account
    FOREIGN KEY (account_id) REFERENCES accounts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- account_sync_settings (per account automation toggles / intervals)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_sync_settings (
  id                                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id                          BIGINT UNSIGNED NOT NULL,
  sync_products_enabled               TINYINT(1) NOT NULL DEFAULT 1,
  sync_inventory_enabled              TINYINT(1) NOT NULL DEFAULT 1,
  sync_price_enabled                  TINYINT(1) NOT NULL DEFAULT 1,
  sync_images_enabled                 TINYINT(1) NOT NULL DEFAULT 1,
  auto_token_refresh_enabled          TINYINT(1) NOT NULL DEFAULT 1,
  product_sync_interval_minutes       INT UNSIGNED NOT NULL DEFAULT 30,
  inventory_sync_interval_minutes     INT UNSIGNED NOT NULL DEFAULT 15,
  price_sync_interval_minutes         INT UNSIGNED NOT NULL DEFAULT 30,
  token_refresh_before_minutes        INT UNSIGNED NOT NULL DEFAULT 60,
  created_at                          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_account_sync_settings_account (account_id),

  CONSTRAINT fk_account_sync_settings_account
    FOREIGN KEY (account_id) REFERENCES accounts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- sync_jobs / sync_job_items (generic automation job run history)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_jobs (
  id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_uid                   VARCHAR(80) NOT NULL,
  account_id                BIGINT UNSIGNED NULL,
  platform_code             VARCHAR(30) NULL,
  sync_type                 VARCHAR(60) NOT NULL,
  direction                 ENUM('pull', 'push') NOT NULL DEFAULT 'pull',
  status                    ENUM('running', 'success', 'partial', 'failed') NOT NULL DEFAULT 'running',
  total_records             INT UNSIGNED NOT NULL DEFAULT 0,
  success_records           INT UNSIGNED NOT NULL DEFAULT 0,
  failed_records            INT UNSIGNED NOT NULL DEFAULT 0,
  skipped_records           INT UNSIGNED NOT NULL DEFAULT 0,
  message                   TEXT NULL,
  error_details             TEXT NULL,
  triggered_by_type         ENUM('system', 'user') NOT NULL DEFAULT 'system',
  triggered_by_user_id      BIGINT UNSIGNED NULL,
  started_at                DATETIME NULL,
  finished_at               DATETIME NULL,
  created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_sync_jobs_uid (job_uid),
  KEY idx_sync_jobs_account (account_id),
  KEY idx_sync_jobs_type (sync_type),
  KEY idx_sync_jobs_status (status),
  KEY idx_sync_jobs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sync_job_items (
  id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id                    BIGINT UNSIGNED NOT NULL,
  account_id                BIGINT UNSIGNED NULL,
  item_type                 VARCHAR(60) NULL,
  sku                       VARCHAR(80) NULL,
  local_reference           VARCHAR(120) NULL,
  marketplace_reference     VARCHAR(120) NULL,
  status                    ENUM('success', 'failed', 'skipped') NOT NULL DEFAULT 'success',
  error_code                VARCHAR(60) NULL,
  error_details             TEXT NULL,
  message                   TEXT NULL,
  created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_sync_job_items_job (job_id),
  KEY idx_sync_job_items_sku (sku),
  KEY idx_sync_job_items_status (status),

  CONSTRAINT fk_sync_job_items_job
    FOREIGN KEY (job_id) REFERENCES sync_jobs (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- api_request_logs (every outbound Daraz / Woo API call)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_request_logs (
  id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_uid               VARCHAR(80) NULL,
  account_id                BIGINT UNSIGNED NULL,
  platform_code             VARCHAR(30) NULL,
  request_type              VARCHAR(60) NULL,
  http_method                VARCHAR(10) NULL,
  endpoint                  VARCHAR(255) NULL,
  request_summary           TEXT NULL,
  response_summary          TEXT NULL,
  response_status_code      INT NULL,
  api_status                VARCHAR(30) NULL,
  error_code                VARCHAR(60) NULL,
  error_message             TEXT NULL,
  duration_ms               INT UNSIGNED NULL,
  request_time              DATETIME NULL,
  response_time             DATETIME NULL,
  created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_api_request_logs_account (account_id),
  KEY idx_api_request_logs_platform (platform_code),
  KEY idx_api_request_logs_status (api_status),
  KEY idx_api_request_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- token_logs (OAuth / API token refresh history)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS token_logs (
  id                              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id                      BIGINT UNSIGNED NOT NULL,
  platform_code                   VARCHAR(30) NULL,
  action_type                     VARCHAR(60) NOT NULL,
  refresh_status                  VARCHAR(30) NULL,
  old_access_token_expires_at     DATETIME NULL,
  new_access_token_expires_at     DATETIME NULL,
  refresh_token_expires_at        DATETIME NULL,
  error_code                      VARCHAR(60) NULL,
  error_details                   TEXT NULL,
  message                         TEXT NULL,
  created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_token_logs_account (account_id),
  KEY idx_token_logs_created (created_at),

  CONSTRAINT fk_token_logs_account
    FOREIGN KEY (account_id) REFERENCES accounts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

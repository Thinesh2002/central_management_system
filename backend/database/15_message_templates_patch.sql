-- =====================================================================
-- 15_message_templates_patch.sql
-- Customer message templates (order confirmation, shipped, delivered,
-- custom, etc.) used to send Daraz Instant Messages to buyers from the
-- Order Detail page.
--
-- message_templates lives in its own new database, cm_message_management.
-- message_logs (what was actually sent, to which order, success/failure)
-- goes into the existing cm_logs_management database alongside the app's
-- other audit-trail tables.
--
-- Run this after 01 to 14 database setup files.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS cm_message_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cm_message_management;

CREATE TABLE IF NOT EXISTS message_templates (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  trigger_key   VARCHAR(60)  NOT NULL DEFAULT 'custom',
  content       TEXT NOT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_by    BIGINT UNSIGNED NULL,
  updated_by    BIGINT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_message_templates_trigger_key (trigger_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- message_logs (sent-message audit trail) — cm_logs_management, next to
-- this app's other *_logs tables rather than a new database of its own.
-- ---------------------------------------------------------------------
USE cm_logs_management;

CREATE TABLE IF NOT EXISTS message_logs (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source            VARCHAR(20)  NOT NULL DEFAULT 'daraz',
  source_order_id   BIGINT UNSIGNED NOT NULL,
  template_id       BIGINT UNSIGNED NULL,
  session_id        VARCHAR(120) NULL,
  daraz_message_id  VARCHAR(120) NULL,
  content           TEXT NOT NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'sent',
  error_message     TEXT NULL,
  sent_by           BIGINT UNSIGNED NULL,
  sent_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_message_logs_order (source, source_order_id),
  KEY idx_message_logs_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Register the settings page so Access Control can manage per-user
-- permissions for it, same as every other menu entry.
USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('message_templates', 'Message Templates', '/order-management/message-templates', 'MessageSquare', 144, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

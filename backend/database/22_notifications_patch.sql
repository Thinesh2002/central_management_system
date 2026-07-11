-- =====================================================================
-- 22_notifications_patch.sql
-- Generic notification center: any backend feature can create a
-- notification here; the frontend bell icon polls and displays them.
--
-- Lives in cm_logs_management alongside the app's other audit tables.
--
-- Run this after 01 to 21 database setup files.
-- =====================================================================

USE cm_logs_management;

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type        VARCHAR(40)  NOT NULL,
  severity    VARCHAR(20)  NOT NULL DEFAULT 'info',
  title       VARCHAR(255) NOT NULL,
  message     TEXT NULL,
  link        VARCHAR(500) NULL,
  is_read     TINYINT(1)   NOT NULL DEFAULT 0,
  read_at     DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_notifications_type (type),
  KEY idx_notifications_is_read (is_read),
  KEY idx_notifications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 26_supplier_management_patch.sql
-- Phase 2 of the AI-assisted operations roadmap: Supplier Management.
-- New dedicated database (cm_supplier_management), matching the existing
-- one-database-per-domain pattern (cm_inventory_management,
-- cm_price_management, etc.) - Purchase Orders / GRN / Cost Price History
-- will live here alongside suppliers as they're built.
--
-- Master-admin-only feature: this table intentionally does NOT go through
-- the delegable user_permissions system - both the frontend route and
-- every backend endpoint hard-check req.user.role === 'master_admin'
-- directly, so it can't be opened up to admin/user via Access Control.
--
-- Run this after 01 to 25 database setup files.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS cm_supplier_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cm_supplier_management;

CREATE TABLE IF NOT EXISTS suppliers (
  id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                        VARCHAR(200) NOT NULL,
  contact_email               VARCHAR(190) NULL,
  contact_phone               VARCHAR(40) NULL,
  business_registration_no    VARCHAR(100) NULL,
  payment_terms               ENUM('net_30', 'net_60', 'cod', 'advance', 'other') NOT NULL DEFAULT 'cod',
  currency                    VARCHAR(10) NOT NULL DEFAULT 'LKR',
  delivery_lead_time_days     INT UNSIGNED NULL,
  rating                      DECIMAL(3, 2) NULL,
  status                      ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  notes                       TEXT NULL,
  created_by                  BIGINT UNSIGNED NULL,
  updated_by                  BIGINT UNSIGNED NULL,
  created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at                  TIMESTAMP NULL DEFAULT NULL,

  KEY idx_suppliers_status (status),
  KEY idx_suppliers_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registered for sidebar navigation only - visibility for non-master-admins
-- is still hard-blocked at the route/API level regardless of Access
-- Control grants (see note above).
USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('suppliers', 'Suppliers', '/suppliers', 'Truck', 5, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

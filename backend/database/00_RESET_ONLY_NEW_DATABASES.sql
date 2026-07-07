-- =====================================================================
-- 00_RESET_ONLY_NEW_DATABASES.sql
-- Central Management System - Database Reset
--
-- WARNING: This drops the 6 approved databases and recreates them empty.
-- Run this ONLY on a fresh setup. Do not run in production if you need
-- to keep existing data.
-- =====================================================================

DROP DATABASE IF EXISTS cm_auth_management;
DROP DATABASE IF EXISTS cm_product_management;
DROP DATABASE IF EXISTS cm_inventory_management;
DROP DATABASE IF EXISTS cm_price_management;
DROP DATABASE IF EXISTS cm_marketplace_management;
DROP DATABASE IF EXISTS cm_logs_management;

CREATE DATABASE IF NOT EXISTS cm_auth_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS cm_product_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS cm_inventory_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS cm_price_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS cm_marketplace_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS cm_logs_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

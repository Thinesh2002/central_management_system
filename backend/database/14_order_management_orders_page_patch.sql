-- =====================================================================
-- 14_order_management_orders_page_patch.sql
-- Registers the new Orders Management pages for Access Control:
-- Orders list/detail/create, and Daraz Order Sync Settings.
-- This only touches cm_auth_management.app_pages — no changes to
-- cm_order_management tables are made by this patch.
-- Run this after 01 to 13 database setup files.
-- =====================================================================

USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES
  ('orders', 'Orders', '/order-management/orders', 'Package', 142, 'active'),
  ('order_sync_settings', 'Daraz Sync Settings', '/order-management/sync-settings', 'Clock', 143, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

-- =====================================================================
-- 54_server_storage_page_patch.sql
-- Registers the new Server Storage settings page (VPS disk space:
-- total/used/available) in Access Control.
-- =====================================================================

USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('server_storage', 'Server Storage', '/settings/server-storage', 'HardDrive', 285, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name), route_path = VALUES(route_path);

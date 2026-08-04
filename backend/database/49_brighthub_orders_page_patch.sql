-- =====================================================================
-- 49_brighthub_orders_page_patch.sql
-- Registers the new Website Orders page (BrightHub orders: list, detail,
-- status update) in Access Control, mirroring the brighthub_products
-- page registration from 44_brighthub_integration_patch.sql.
-- =====================================================================

USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('brighthub_orders', 'Website Orders', '/product/brighthub-orders', 'Package', 149, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name), route_path = VALUES(route_path);

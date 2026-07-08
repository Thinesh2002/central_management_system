-- =====================================================================
-- 13_product_trends_page_patch.sql
-- Registers the Product Trend Report page for Access Control. No new
-- tables — this report is computed live from existing order/inventory
-- data, nothing is stored.
-- Run this after 01 to 12 database setup files.
-- =====================================================================

USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('product_trends', 'Product Trends', '/order-management/product-trends', 'BarChart3', 141, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

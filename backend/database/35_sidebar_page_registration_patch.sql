-- =====================================================================
-- 35_sidebar_page_registration_patch.sql
-- Several existing pages (Dashboard, Users, Access Control, Logs,
-- Inventory, Price Dashboard, Daraz Sync Logs, AI Content Optimizer)
-- were reachable by direct URL but had no Sidebar.jsx link at all -
-- fixed on the frontend in the same commit as this patch. This patch
-- only handles the two things that needed a DB-side fix:
--
--   1. The original seed's "pricing" page_key points route_path at
--      /pricing, but the real React route is /price - correcting it so
--      the new sidebar link and Access Control both point somewhere real.
--   2. Daraz Transfer (/product/daraz-products/transfer) never had its
--      own app_pages row at all - added so it can be granted/denied via
--      Access Control independently of the main Daraz Products page.
--
-- Run this after 34_daraz_webhook_patch.sql.
-- =====================================================================

USE cm_auth_management;

UPDATE app_pages SET route_path = '/price' WHERE page_key = 'pricing';

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('daraz_transfer', 'Daraz Transfer', '/product/daraz-products/transfer', 'CloudUpload', 33, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

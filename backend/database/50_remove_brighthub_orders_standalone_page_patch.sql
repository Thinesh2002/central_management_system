-- =====================================================================
-- 50_remove_brighthub_orders_standalone_page_patch.sql
-- Reverts the brighthub_orders app_pages row added in
-- 49_brighthub_orders_page_patch.sql - the standalone Website Orders
-- list page/route was removed; BrightHub orders now show merged into
-- the existing Orders page (page_key "orders") instead of a separate
-- nav entry/permission.
-- =====================================================================

USE cm_auth_management;

DELETE FROM app_pages WHERE page_key = 'brighthub_orders';

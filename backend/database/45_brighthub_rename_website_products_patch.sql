-- =====================================================================
-- 45_brighthub_rename_website_products_patch.sql
-- The old "Website Products" sidebar entry (page_key 'products', linked
-- to Local Products) is removed from the sidebar now that BrightHub is
-- a real, synced integration - "Website Products" now refers to the
-- BrightHub Products page instead. Rename the DB row so Access Control
-- shows the same label as the sidebar.
-- =====================================================================

USE cm_auth_management;

UPDATE app_pages
SET page_name = 'Website Products'
WHERE page_key = 'brighthub_products';

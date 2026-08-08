-- =====================================================================
-- 56_remove_daraz_sync_logs_page_patch.sql
-- The standalone "Daraz Sync Logs" page (page_key "sync_logs") is
-- removed - its filtered view is now the "Sync Logs" tab on the Logs
-- page (page_key "logs") instead of a separate nav entry/permission.
-- =====================================================================

USE cm_auth_management;

DELETE FROM app_pages WHERE page_key = 'sync_logs';

-- Seeds a default order_sync_settings row so the Daraz Sync Settings page
-- has something to load and edit instead of rendering empty. The model
-- (order_sync_settings_model.js) always reads the first row regardless of
-- platform_code, so exactly one seed row is enough.
USE cm_order_management;

INSERT INTO order_sync_settings (platform_code, sync_enabled, auto_sync_enabled, sync_interval_minutes, fetch_order_days)
SELECT 'daraz', 1, 1, 30, 7
WHERE NOT EXISTS (SELECT 1 FROM order_sync_settings);

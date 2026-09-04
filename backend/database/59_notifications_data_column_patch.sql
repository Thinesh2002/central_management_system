-- =====================================================================
-- 59_notifications_data_column_patch.sql
-- Adds a flexible JSON payload column to notifications so richer
-- notification types (starting with "new order received") can carry
-- structured details - order number, customer, total, product image -
-- without needing a new table or another schema change for the next
-- rich notification type.
-- =====================================================================

USE cm_logs_management;

ALTER TABLE notifications
  ADD COLUMN data JSON NULL AFTER link;

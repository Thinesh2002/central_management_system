-- =====================================================================
-- 48_brighthub_products_soft_delete_patch.sql
-- Adds soft-delete support to brighthub_products so deleting a product
-- from the Website Products page (which deletes it on BrightHub itself
-- via DELETE /products/:bhid) can also hide the local mirror row,
-- matching the soft-delete convention every other product table uses.
-- =====================================================================

USE cm_product_management;

ALTER TABLE brighthub_products
  ADD COLUMN deleted_at DATETIME NULL AFTER updated_at;

-- =====================================================================
-- 52_brighthub_stock_quantity_patch.sql
-- Adds a dedicated stock_quantity column to brighthub_products so the
-- Inventory page can show/sync Website (BrightHub) stock the same way
-- it already does for Daraz Stock, instead of digging through raw_json.
-- =====================================================================

USE cm_product_management;

ALTER TABLE brighthub_products
  ADD COLUMN stock_quantity INT NULL AFTER price;

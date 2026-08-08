-- =====================================================================
-- 55_remove_price_rules_patch.sql
-- Removes the Price Rule Engine feature entirely (added in
-- 30_price_rules_patch.sql): the price_rules table, the suggested_*
-- columns it wrote on product_prices, and its Access Control page entry.
-- Verified zero rows in price_rules and zero non-null suggested_* values
-- before writing this.
-- =====================================================================

USE cm_price_management;

DROP TABLE IF EXISTS price_rules;

ALTER TABLE product_prices
  DROP COLUMN suggested_sale_price,
  DROP COLUMN suggested_daraz_price,
  DROP COLUMN suggested_at;

USE cm_auth_management;

DELETE FROM app_pages WHERE page_key = 'price_rules';

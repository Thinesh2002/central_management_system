-- =====================================================================
-- 57_variant_description_patch.sql
-- Adds description / short_description columns to product_variants, so
-- each child variant can carry its own copy instead of only ever
-- inheriting the parent product's. product_variant_model.js is fully
-- schema-introspecting (SHOW COLUMNS at runtime), so no backend code
-- change is needed - just this column addition plus a backend restart
-- to clear its cached column list.
-- =====================================================================

USE cm_product_management;

ALTER TABLE product_variants
  ADD COLUMN short_description TEXT NULL AFTER variant_name,
  ADD COLUMN description TEXT NULL AFTER short_description;

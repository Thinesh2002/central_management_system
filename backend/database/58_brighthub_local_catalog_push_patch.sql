-- =====================================================================
-- 58_brighthub_local_catalog_push_patch.sql
-- Supports pushing the local product catalog (products + categories) OUT
-- to BrightHub (the live storefront) - the reverse direction of the
-- existing pull-based brighthub_products mirror.
--
-- local_product_id marks which local product a given brighthub_products
-- row was created FROM (NULL for rows that came from the existing pull
-- sync instead), so the push job can tell which local products have
-- already been sent and skip them forever after - once transferred,
-- further edits happen on BrightHub's side only, not here.
-- =====================================================================

USE cm_product_management;

ALTER TABLE brighthub_products
  ADD COLUMN local_product_id BIGINT UNSIGNED NULL AFTER source_product_id,
  ADD UNIQUE KEY uq_brighthub_products_local_product (account_id, local_product_id);

ALTER TABLE categories
  ADD COLUMN brighthub_category_id INT UNSIGNED NULL AFTER description;

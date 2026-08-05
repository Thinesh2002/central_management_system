-- =====================================================================
-- 53_brighthub_children_count_patch.sql
-- Adds a dedicated children_count column to brighthub_products so the
-- Website Products list can tell parent (variation family) products
-- apart from standalone ones without an extra API call per row - the
-- list endpoint's own response already carries this field (undocumented
-- but confirmed present on every synced row), it just wasn't stored
-- outside raw_json until now. Backfills existing rows from their
-- already-synced raw_json so this works immediately, no re-sync needed.
-- =====================================================================

USE cm_product_management;

ALTER TABLE brighthub_products
  ADD COLUMN children_count INT NULL AFTER category_id;

UPDATE brighthub_products
SET children_count = CAST(JSON_EXTRACT(raw_json, '$.children_count') AS UNSIGNED)
WHERE raw_json IS NOT NULL
  AND JSON_EXTRACT(raw_json, '$.children_count') IS NOT NULL;

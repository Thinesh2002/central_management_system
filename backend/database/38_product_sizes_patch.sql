-- =====================================================================
-- 38_product_sizes_patch.sql
-- Adds Size as a second, independent variant dimension alongside the
-- existing Colour one - product_sizes mirrors product_colours, and
-- product_variants gets size_id/size_name/size_code columns mirroring
-- its existing colour_id/colour_name/colour_code columns.
--
-- product_variant_model.js is schema-introspecting (SHOW COLUMNS FROM
-- product_variants), so these new columns are picked up automatically
-- once the backend restarts - no model/controller code changes needed
-- for the variant CRUD itself.
-- =====================================================================

USE cm_product_management;

CREATE TABLE IF NOT EXISTS product_sizes (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  size_code     VARCHAR(40)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(120) NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  description   TEXT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,

  UNIQUE KEY uq_product_sizes_code (size_code),
  KEY idx_product_sizes_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO product_sizes (size_code, name, slug, sort_order)
VALUES
  ('S', 'Small', 'small', 1),
  ('M', 'Medium', 'medium', 2),
  ('L', 'Large', 'large', 3),
  ('XL', 'Extra Large', 'extra-large', 4)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Idempotent-ALTER pattern: MySQL has no "ADD COLUMN IF NOT EXISTS"
-- before 8.0.29-equivalent guarantees across all deployments used by
-- this project, so guard each ALTER with an information_schema check
-- via a procedure, matching this repo's established convention.
DROP PROCEDURE IF EXISTS add_column_if_missing;

CREATE PROCEDURE add_column_if_missing(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN ddl VARCHAR(500)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = tbl AND column_name = col
  ) THEN
    SET @ddl = ddl;
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END;

CALL add_column_if_missing('product_variants', 'size_id', 'ALTER TABLE product_variants ADD COLUMN size_id BIGINT UNSIGNED NULL AFTER colour_code');
CALL add_column_if_missing('product_variants', 'size_name', 'ALTER TABLE product_variants ADD COLUMN size_name VARCHAR(100) NULL AFTER size_id');
CALL add_column_if_missing('product_variants', 'size_code', 'ALTER TABLE product_variants ADD COLUMN size_code VARCHAR(40) NULL AFTER size_name');

DROP PROCEDURE IF EXISTS add_column_if_missing;

-- FK + index added separately (can't easily guard a FK add the same way
-- without risking a duplicate-constraint error on re-run, so this uses
-- a plain existence check against information_schema instead).
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'product_variants'
    AND constraint_name = 'fk_product_variants_size'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE product_variants ADD CONSTRAINT fk_product_variants_size FOREIGN KEY (size_id) REFERENCES product_sizes (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'product_variants' AND index_name = 'idx_product_variants_size'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE product_variants ADD INDEX idx_product_variants_size (size_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Register the new Size master page in the sidebar/permissions system.
USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('sizes', 'Sizes', '/product/sizes', 'Ruler', 61, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

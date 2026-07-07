-- =====================================================================
-- 08_product_images_media_library_patch.sql
-- Images Dashboard / media library patch for existing servers.
-- Run this after 01 to 07 database setup files.
-- =====================================================================

USE cm_product_management;

DROP PROCEDURE IF EXISTS add_column_if_missing;

CREATE PROCEDURE add_column_if_missing(
  IN db_name VARCHAR(128),
  IN table_name_value VARCHAR(128),
  IN column_name_value VARCHAR(128),
  IN alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = db_name
      AND TABLE_NAME = table_name_value
      AND COLUMN_NAME = column_name_value
  ) THEN
    SET @stmt = alter_sql;
    PREPARE prepared_stmt FROM @stmt;
    EXECUTE prepared_stmt;
    DEALLOCATE PREPARE prepared_stmt;
  END IF;
END;

-- SKU is the system-wide key for local products; product_id is only an
-- internal relation, so an image must be allowed to exist before (or
-- without ever) being attached to a product record.
ALTER TABLE cm_product_management.product_images
  MODIFY COLUMN product_id BIGINT UNSIGNED NULL;

CALL add_column_if_missing(
  'cm_product_management',
  'product_images',
  'alt_text',
  'ALTER TABLE cm_product_management.product_images ADD COLUMN alt_text VARCHAR(255) NULL AFTER file_type'
);

DROP PROCEDURE IF EXISTS add_column_if_missing;

-- Register the page so the Access Control screen can manage per-user
-- permissions for it, same as every other menu entry.
USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('images_dashboard', 'Images Dashboard', '/product/images', 'Image', 25, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

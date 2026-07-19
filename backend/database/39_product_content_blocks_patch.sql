-- =====================================================================
-- 39_product_content_blocks_patch.sql
-- Amazon A+ Premium Content-style description builder: a product's
-- description becomes a reorderable list of image+text content blocks
-- instead of (or alongside) one plain description field. Mirrors
-- product_images' ownership/ordering pattern (product_id + sort_order).
--
-- Also fixes a pre-existing dead-field bug found while researching this:
-- LocalProductBasicPage.jsx has always sent `short_description`, but
-- products never had a matching column, so product_model.js's dynamic
-- column-driven create/update silently dropped it on every save.
-- =====================================================================

USE cm_product_management;

CREATE TABLE IF NOT EXISTS product_content_blocks (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    BIGINT UNSIGNED NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  layout        ENUM('image_left', 'image_right', 'image_full', 'text_only') NOT NULL DEFAULT 'image_left',
  heading       VARCHAR(255) NULL,
  body_html     TEXT NULL,
  image_id      BIGINT UNSIGNED NULL,
  image_url     VARCHAR(500) NULL,
  status        ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_by    BIGINT UNSIGNED NULL,
  updated_by    BIGINT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,

  KEY idx_product_content_blocks_product (product_id),
  KEY idx_product_content_blocks_deleted (deleted_at),

  CONSTRAINT fk_product_content_blocks_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_product_content_blocks_image
    FOREIGN KEY (image_id) REFERENCES product_images (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Idempotent-ALTER pattern, same convention used elsewhere in this repo.
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

CALL add_column_if_missing('products', 'short_description', 'ALTER TABLE products ADD COLUMN short_description TEXT NULL AFTER description');

DROP PROCEDURE IF EXISTS add_column_if_missing;

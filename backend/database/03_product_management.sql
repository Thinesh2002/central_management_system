-- =====================================================================
-- 02_product_management.sql
-- Database: cm_product_management
-- Local product master data: categories, sub-categories, models,
-- colours, attributes, products, variants, images.
--
-- Business rule: Local product is the master. SKU is the primary key
-- used everywhere else in the system (inventory, pricing, marketplace
-- sync), not the numeric id.
-- =====================================================================

USE cm_product_management;

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_code   VARCHAR(40)  NOT NULL,
  name            VARCHAR(150) NOT NULL,
  slug            VARCHAR(170) NOT NULL,
  description     TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL DEFAULT NULL,

  UNIQUE KEY uq_categories_code (category_code),
  KEY idx_categories_slug (slug),
  KEY idx_categories_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- sub_categories (linked to categories via category_code, natural key)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sub_categories (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sub_category_code   VARCHAR(40)  NOT NULL,
  category_code       VARCHAR(40)  NOT NULL,
  name                VARCHAR(150) NOT NULL,
  slug                VARCHAR(170) NOT NULL,
  description         TEXT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          TIMESTAMP NULL DEFAULT NULL,

  UNIQUE KEY uq_sub_categories_code (sub_category_code),
  KEY idx_sub_categories_category_code (category_code),
  KEY idx_sub_categories_deleted (deleted_at),

  CONSTRAINT fk_sub_categories_category
    FOREIGN KEY (category_code) REFERENCES categories (category_code)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- product_models (e.g. iPhone 15, Galaxy S24 ...)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_models (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  model_code        VARCHAR(40)  NOT NULL,
  category_id       BIGINT UNSIGNED NULL,
  sub_category_id   BIGINT UNSIGNED NULL,
  name              VARCHAR(150) NOT NULL,
  slug              VARCHAR(170) NOT NULL,
  description       TEXT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP NULL DEFAULT NULL,

  UNIQUE KEY uq_product_models_code (model_code),
  KEY idx_product_models_category (category_id),
  KEY idx_product_models_sub_category (sub_category_id),
  KEY idx_product_models_deleted (deleted_at),

  CONSTRAINT fk_product_models_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_product_models_sub_category
    FOREIGN KEY (sub_category_id) REFERENCES sub_categories (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- product_colours
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_colours (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  colour_code   VARCHAR(40)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(120) NOT NULL,
  hex_code      VARCHAR(20)  NULL,
  description   TEXT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,

  UNIQUE KEY uq_product_colours_code (colour_code),
  KEY idx_product_colours_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- attributes / attribute_values (e.g. RAM: 4GB/6GB/8GB, Storage: 64/128GB)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attributes (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  slug          VARCHAR(140) NOT NULL,
  input_type    ENUM('text', 'select', 'multiselect', 'number', 'boolean') NOT NULL DEFAULT 'select',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,

  UNIQUE KEY uq_attributes_slug (slug),
  KEY idx_attributes_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attribute_values (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attribute_id    BIGINT UNSIGNED NOT NULL,
  value           VARCHAR(150) NOT NULL,
  slug            VARCHAR(170) NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL DEFAULT NULL,

  KEY idx_attribute_values_attribute (attribute_id),
  KEY idx_attribute_values_deleted (deleted_at),

  CONSTRAINT fk_attribute_values_attribute
    FOREIGN KEY (attribute_id) REFERENCES attributes (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- products (master / local product - the single source of truth)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku               VARCHAR(80)  NOT NULL,
  product_name      VARCHAR(200) NOT NULL,
  category_id       BIGINT UNSIGNED NULL,
  sub_category_id   BIGINT UNSIGNED NULL,
  model_id          BIGINT UNSIGNED NULL,
  description       TEXT NULL,
  has_variants      TINYINT(1) NOT NULL DEFAULT 0,
  status            ENUM('active', 'inactive', 'draft') NOT NULL DEFAULT 'active',
  created_by        BIGINT UNSIGNED NULL,
  updated_by        BIGINT UNSIGNED NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP NULL DEFAULT NULL,

  UNIQUE KEY uq_products_sku (sku),
  KEY idx_products_category (category_id),
  KEY idx_products_sub_category (sub_category_id),
  KEY idx_products_model (model_id),
  KEY idx_products_status (status),
  KEY idx_products_deleted (deleted_at),

  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_products_sub_category
    FOREIGN KEY (sub_category_id) REFERENCES sub_categories (id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_products_model
    FOREIGN KEY (model_id) REFERENCES product_models (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- product_variants (colour / SKU level variant of a product)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id      BIGINT UNSIGNED NOT NULL,
  variant_sku     VARCHAR(80)  NOT NULL,
  variant_name    VARCHAR(200) NULL,
  colour_id       BIGINT UNSIGNED NULL,
  colour_name     VARCHAR(100) NULL,
  colour_code     VARCHAR(40)  NULL,
  image_url       VARCHAR(500) NULL,
  status          ENUM('active', 'inactive', 'draft') NOT NULL DEFAULT 'active',
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL DEFAULT NULL,

  UNIQUE KEY uq_product_variants_sku (variant_sku),
  KEY idx_product_variants_product (product_id),
  KEY idx_product_variants_colour (colour_id),
  KEY idx_product_variants_deleted (deleted_at),

  CONSTRAINT fk_product_variants_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_product_variants_colour
    FOREIGN KEY (colour_id) REFERENCES product_colours (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- product_images (multiple images per product / variant, any image type)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    BIGINT UNSIGNED NULL,
  variant_id    BIGINT UNSIGNED NULL,
  sku           VARCHAR(80)  NULL,
  image_path    VARCHAR(500) NOT NULL,
  image_url     VARCHAR(500) NOT NULL,
  file_name     VARCHAR(255) NULL,
  file_type     VARCHAR(40)  NULL,
  file_size     INT UNSIGNED NULL,
  alt_text      VARCHAR(255) NULL,
  is_main       TINYINT(1) NOT NULL DEFAULT 0,
  sort_order    INT UNSIGNED NOT NULL DEFAULT 0,
  status        ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  uploaded_by   BIGINT UNSIGNED NULL,
  created_by    BIGINT UNSIGNED NULL,
  updated_by    BIGINT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL,

  KEY idx_product_images_product (product_id),
  KEY idx_product_images_variant (variant_id),
  KEY idx_product_images_sku (sku),
  KEY idx_product_images_deleted (deleted_at),

  CONSTRAINT fk_product_images_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_product_images_variant
    FOREIGN KEY (variant_id) REFERENCES product_variants (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- product_attribute_values (product/variant <-> attribute value mapping)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_attribute_values (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id            BIGINT UNSIGNED NOT NULL,
  variant_id            BIGINT UNSIGNED NULL,
  attribute_id          BIGINT UNSIGNED NOT NULL,
  attribute_value_id    BIGINT UNSIGNED NOT NULL,
  created_by            BIGINT UNSIGNED NULL,
  updated_by            BIGINT UNSIGNED NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at            TIMESTAMP NULL DEFAULT NULL,

  KEY idx_pav_product (product_id),
  KEY idx_pav_variant (variant_id),
  KEY idx_pav_attribute (attribute_id),
  KEY idx_pav_attribute_value (attribute_value_id),

  CONSTRAINT fk_pav_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_pav_variant
    FOREIGN KEY (variant_id) REFERENCES product_variants (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_pav_attribute
    FOREIGN KEY (attribute_id) REFERENCES attributes (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_pav_attribute_value
    FOREIGN KEY (attribute_value_id) REFERENCES attribute_values (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Seed: starter categories / colours so the UI is not empty on first run
-- ---------------------------------------------------------------------
INSERT INTO categories (category_code, name, slug, description) VALUES
('CAT0001', 'Mobile Phones', 'mobile-phones', 'Smartphones and feature phones'),
('CAT0002', 'Accessories', 'accessories', 'Chargers, cases, cables and other accessories')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO product_colours (colour_code, name, slug, hex_code) VALUES
('COL-BLK', 'Black', 'black', '#000000'),
('COL-WHT', 'White', 'white', '#FFFFFF'),
('COL-BLU', 'Blue',  'blue',  '#1E3A8A')
ON DUPLICATE KEY UPDATE name = VALUES(name);
-- =====================================================================
-- Daraz product mirror (marketplace copy, never the source of truth)
-- =====================================================================
CREATE TABLE IF NOT EXISTS daraz_products (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id            BIGINT UNSIGNED NOT NULL,
  local_product_id      BIGINT UNSIGNED NULL,
  local_variant_id      BIGINT UNSIGNED NULL,
  daraz_item_id         VARCHAR(80) NULL,
  daraz_product_id      VARCHAR(80) NULL,
  seller_sku            VARCHAR(80) NULL,
  name                  VARCHAR(255) NULL,
  short_description     TEXT NULL,
  brand                 VARCHAR(150) NULL,
  primary_category      VARCHAR(150) NULL,
  price                 DECIMAL(12, 2) NULL,
  sale_price            DECIMAL(12, 2) NULL,
  currency              VARCHAR(10) NULL DEFAULT 'LKR',
  quantity              INT NULL,
  status                VARCHAR(40) NULL,
  sync_status           VARCHAR(40) NOT NULL DEFAULT 'synced',
  main_image            VARCHAR(500) NULL,
  images_json           JSON NULL,
  attributes_json       JSON NULL,
  skus_json             JSON NULL,
  raw_json              JSON NULL,
  daraz_created_at      DATETIME NULL,
  daraz_updated_at      DATETIME NULL,
  last_synced_at        DATETIME NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_daraz_products_account_item (account_id, daraz_item_id),
  UNIQUE KEY uq_daraz_products_account_sku (account_id, seller_sku),
  KEY idx_daraz_products_account (account_id),
  KEY idx_daraz_products_sku (seller_sku),
  KEY idx_daraz_products_item (daraz_item_id),
  KEY idx_daraz_products_sync_status (sync_status),

  CONSTRAINT fk_daraz_products_account
    FOREIGN KEY (account_id) REFERENCES cm_marketplace_management.accounts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daraz_product_variants (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id        BIGINT UNSIGNED NOT NULL,
  daraz_item_id     VARCHAR(80) NULL,
  daraz_sku_id      VARCHAR(80) NULL,
  seller_sku        VARCHAR(80) NULL,
  name              VARCHAR(255) NULL,
  price             DECIMAL(12, 2) NULL,
  sale_price        DECIMAL(12, 2) NULL,
  quantity          INT NULL,
  status            VARCHAR(40) NULL,
  variant_json      JSON NULL,
  last_synced_at    DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_daraz_variants_account_sku (account_id, seller_sku),
  KEY idx_daraz_variants_account (account_id),
  KEY idx_daraz_variants_sku (seller_sku),

  CONSTRAINT fk_daraz_variants_account
    FOREIGN KEY (account_id) REFERENCES cm_marketplace_management.accounts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daraz_product_sync_runs (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id        BIGINT UNSIGNED NOT NULL,
  sync_type         VARCHAR(60) NOT NULL DEFAULT 'product_sync',
  status            ENUM('running', 'success', 'partial', 'failed') NOT NULL DEFAULT 'running',
  total_found       INT UNSIGNED NOT NULL DEFAULT 0,
  total_saved       INT UNSIGNED NOT NULL DEFAULT 0,
  total_failed      INT UNSIGNED NOT NULL DEFAULT 0,
  error_message     TEXT NULL,
  started_at        DATETIME NULL,
  finished_at       DATETIME NULL,

  KEY idx_daraz_sync_runs_account (account_id),

  CONSTRAINT fk_daraz_sync_runs_account
    FOREIGN KEY (account_id) REFERENCES cm_marketplace_management.accounts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- WooCommerce product mirror (marketplace copy, never the source of truth)
-- =====================================================================
CREATE TABLE IF NOT EXISTS woo_products (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id            BIGINT UNSIGNED NOT NULL,
  woo_product_id        VARCHAR(80) NULL,
  sku                   VARCHAR(80) NULL,
  name                  VARCHAR(255) NULL,
  slug                  VARCHAR(255) NULL,
  description           TEXT NULL,
  short_description     TEXT NULL,
  product_type          VARCHAR(40) NULL,
  status                VARCHAR(40) NULL,
  catalog_visibility    VARCHAR(40) NULL,
  price                 DECIMAL(12, 2) NULL,
  regular_price         DECIMAL(12, 2) NULL,
  sale_price            DECIMAL(12, 2) NULL,
  on_sale               TINYINT(1) NOT NULL DEFAULT 0,
  purchasable           TINYINT(1) NOT NULL DEFAULT 1,
  virtual_product       TINYINT(1) NOT NULL DEFAULT 0,
  downloadable          TINYINT(1) NOT NULL DEFAULT 0,
  manage_stock          TINYINT(1) NOT NULL DEFAULT 1,
  stock_quantity        INT NULL,
  stock_status          VARCHAR(40) NULL,
  weight                VARCHAR(30) NULL,
  dimensions_json       JSON NULL,
  categories_json       JSON NULL,
  images_json           JSON NULL,
  attributes_json       JSON NULL,
  tags_json             JSON NULL,
  permalink             VARCHAR(500) NULL,
  raw_json              JSON NULL,
  date_created          DATETIME NULL,
  date_modified         DATETIME NULL,
  last_synced_at        DATETIME NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_woo_products_account (account_id),
  KEY idx_woo_products_sku (sku),
  KEY idx_woo_products_woo_id (woo_product_id),

  CONSTRAINT fk_woo_products_account
    FOREIGN KEY (account_id) REFERENCES cm_marketplace_management.accounts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS woo_product_variants (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id            BIGINT UNSIGNED NOT NULL,
  woo_product_id        VARCHAR(80) NULL,
  woo_variation_id      VARCHAR(80) NULL,
  sku                   VARCHAR(80) NULL,
  price                 DECIMAL(12, 2) NULL,
  regular_price         DECIMAL(12, 2) NULL,
  sale_price            DECIMAL(12, 2) NULL,
  stock_quantity        INT NULL,
  stock_status          VARCHAR(40) NULL,
  manage_stock          TINYINT(1) NOT NULL DEFAULT 1,
  weight                VARCHAR(30) NULL,
  dimensions_json       JSON NULL,
  attributes_json       JSON NULL,
  image_json            JSON NULL,
  raw_json              JSON NULL,
  date_created          DATETIME NULL,
  date_modified         DATETIME NULL,
  last_synced_at        DATETIME NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_woo_variants_account (account_id),
  KEY idx_woo_variants_sku (sku),

  CONSTRAINT fk_woo_variants_account
    FOREIGN KEY (account_id) REFERENCES cm_marketplace_management.accounts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS woo_product_images (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id        BIGINT UNSIGNED NOT NULL,
  woo_product_id    VARCHAR(80) NULL,
  woo_image_id      VARCHAR(80) NULL,
  image_src         VARCHAR(500) NULL,
  image_name        VARCHAR(255) NULL,
  image_alt         VARCHAR(255) NULL,
  image_position    INT NULL,
  raw_json          JSON NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_woo_images_account (account_id),
  KEY idx_woo_images_product (woo_product_id),

  CONSTRAINT fk_woo_images_account
    FOREIGN KEY (account_id) REFERENCES cm_marketplace_management.accounts (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 51_remove_woo_integration_patch.sql
-- Fully removes the WooCommerce marketplace integration. Confirmed on
-- production before writing this patch: 0 rows in woo_orders,
-- woo_order_items, woo_products, and 0 WOO-platform accounts/credentials
-- anywhere - nothing real is lost by this cleanup.
-- =====================================================================

USE cm_order_management;

DROP TABLE IF EXISTS woo_order_items;
DROP TABLE IF EXISTS woo_orders;

USE cm_product_management;

DROP TABLE IF EXISTS woo_product_variants;
DROP TABLE IF EXISTS woo_product_images;
DROP TABLE IF EXISTS woo_products;

USE cm_logs_management;

DROP TABLE IF EXISTS woo_inventory_sync_logs;

USE cm_price_management;

ALTER TABLE product_prices
  DROP COLUMN woo_price,
  DROP COLUMN suggested_woo_price;

ALTER TABLE price_rules
  MODIFY COLUMN marketplace ENUM('local', 'daraz', 'all')
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all';

USE cm_order_management;

ALTER TABLE customers
  MODIFY COLUMN source_type ENUM('MANUAL', 'DARAZ', 'FACEBOOK', 'WHATSAPP', 'TIKTOK', 'OTHER')
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MANUAL';

USE cm_marketplace_management;

DELETE ac FROM account_credentials ac
  INNER JOIN accounts a ON a.id = ac.account_id
  INNER JOIN platforms p ON p.id = a.platform_id
  WHERE UPPER(p.platform_code) = 'WOO';

DELETE ah FROM account_health ah
  WHERE UPPER(ah.platform_code) = 'WOO';

DELETE a FROM accounts a
  INNER JOIN platforms p ON p.id = a.platform_id
  WHERE UPPER(p.platform_code) = 'WOO';

DELETE FROM platforms WHERE UPPER(platform_code) = 'WOO';

USE cm_auth_management;

DELETE FROM app_pages WHERE page_key = 'woo_products';

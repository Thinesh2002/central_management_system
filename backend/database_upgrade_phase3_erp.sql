-- Central Management System - Phase 3 ERP Upgrade
-- Run this once on your PRODUCT MANAGEMENT database (PM_DB_NAME).
-- This script is additive. It does not delete existing product/price columns, so old pages will not break.

SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_code VARCHAR(80) NOT NULL,
  supplier_name VARCHAR(180) NOT NULL,
  contact_person VARCHAR(120) NULL,
  phone VARCHAR(60) NULL,
  email VARCHAR(160) NULL,
  address TEXT NULL,
  payment_terms VARCHAR(120) NULL,
  lead_time_days INT NOT NULL DEFAULT 7,
  status ENUM('active','inactive','deleted') NOT NULL DEFAULT 'active',
  note TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_suppliers_code (supplier_code),
  KEY idx_suppliers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supplier_products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_id BIGINT UNSIGNED NOT NULL,
  local_sku VARCHAR(160) NOT NULL,
  supplier_sku VARCHAR(160) NULL,
  product_name VARCHAR(255) NULL,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
  moq INT NOT NULL DEFAULT 1,
  lead_time_days INT NOT NULL DEFAULT 7,
  default_warehouse_code VARCHAR(80) NULL,
  status ENUM('active','inactive','deleted') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_supplier_products (supplier_id, local_sku),
  KEY idx_supplier_products_sku (local_sku),
  KEY idx_supplier_products_status (status),
  CONSTRAINT fk_supplier_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supplier_purchase_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  po_number VARCHAR(80) NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  order_date DATE NULL,
  expected_date DATE NULL,
  status ENUM('draft','ordered','partial_received','received','cancelled') NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  note TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_supplier_po_number (po_number),
  KEY idx_supplier_po_supplier (supplier_id),
  KEY idx_supplier_po_status (status),
  CONSTRAINT fk_supplier_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supplier_purchase_order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_order_id BIGINT UNSIGNED NOT NULL,
  local_sku VARCHAR(160) NOT NULL,
  supplier_sku VARCHAR(160) NULL,
  product_name VARCHAR(255) NULL,
  qty_ordered INT NOT NULL DEFAULT 0,
  qty_received INT NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_po_items_po (purchase_order_id),
  KEY idx_po_items_sku (local_sku),
  CONSTRAINT fk_supplier_po_items_po FOREIGN KEY (purchase_order_id) REFERENCES supplier_purchase_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supplier_stock_receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  receipt_number VARCHAR(80) NOT NULL,
  supplier_id BIGINT UNSIGNED NULL,
  purchase_order_id BIGINT UNSIGNED NULL,
  received_date DATE NULL,
  status ENUM('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
  note TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_supplier_receipt_number (receipt_number),
  KEY idx_supplier_receipt_supplier (supplier_id),
  KEY idx_supplier_receipt_po (purchase_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supplier_stock_receipt_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  receipt_id BIGINT UNSIGNED NOT NULL,
  local_sku VARCHAR(160) NOT NULL,
  qty_received INT NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  warehouse_code VARCHAR(80) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_receipt_items_receipt (receipt_id),
  KEY idx_receipt_items_sku (local_sku),
  CONSTRAINT fk_receipt_items_receipt FOREIGN KEY (receipt_id) REFERENCES supplier_stock_receipts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  warehouse_code VARCHAR(80) NOT NULL,
  warehouse_name VARCHAR(160) NOT NULL,
  location VARCHAR(255) NULL,
  status ENUM('active','inactive','deleted') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouses_code (warehouse_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_balances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  local_sku VARCHAR(160) NOT NULL,
  warehouse_code VARCHAR(80) NOT NULL DEFAULT 'MAIN',
  stock_qty INT NOT NULL DEFAULT 0,
  reserved_qty INT NOT NULL DEFAULT 0,
  low_stock_alert_qty INT NOT NULL DEFAULT 5,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_balances_sku_wh (local_sku, warehouse_code),
  KEY idx_inventory_balances_sku (local_sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  local_sku VARCHAR(160) NOT NULL,
  warehouse_code VARCHAR(80) NOT NULL DEFAULT 'MAIN',
  movement_type ENUM('IN','OUT','RESERVED','RELEASED','RETURN','DAMAGE','ADJUSTMENT') NOT NULL DEFAULT 'ADJUSTMENT',
  reference_type VARCHAR(80) NULL,
  reference_id VARCHAR(120) NULL,
  qty_before INT NOT NULL DEFAULT 0,
  qty_change INT NOT NULL DEFAULT 0,
  qty_after INT NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  note TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_inventory_ledger_sku (local_sku),
  KEY idx_inventory_ledger_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  local_sku VARCHAR(160) NOT NULL,
  marketplace VARCHAR(30) NULL,
  account_id BIGINT UNSIGNED NULL,
  order_no VARCHAR(120) NULL,
  reserved_qty INT NOT NULL DEFAULT 0,
  status ENUM('reserved','released','deducted','cancelled') NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_inventory_res_sku (local_sku),
  KEY idx_inventory_res_order (order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_stock_push_queue (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  local_sku VARCHAR(160) NOT NULL,
  marketplace ENUM('DARAZ','WOO','LOCAL') NOT NULL,
  account_id BIGINT UNSIGNED NULL,
  marketplace_sku VARCHAR(160) NULL,
  requested_qty INT NOT NULL DEFAULT 0,
  status ENUM('pending','processing','success','failed','cancelled') NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  pushed_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stock_push_sku (local_sku),
  KEY idx_stock_push_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  marketplace ENUM('DARAZ','WOO','AMAZON','EBAY','LOCAL') NOT NULL,
  account_id BIGINT UNSIGNED NULL,
  account_code VARCHAR(80) NULL,
  local_sku VARCHAR(160) NOT NULL,
  marketplace_sku VARCHAR(160) NOT NULL,
  marketplace_product_id VARCHAR(120) NULL,
  title VARCHAR(500) NULL,
  category_id VARCHAR(120) NULL,
  category_name VARCHAR(255) NULL,
  status VARCHAR(80) NULL,
  listing_url TEXT NULL,
  image_url TEXT NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  last_synced_at DATETIME NULL,
  raw_json JSON NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_marketplace_listing (marketplace, account_id, marketplace_sku),
  KEY idx_marketplace_listings_local_sku (local_sku),
  KEY idx_marketplace_listings_marketplace (marketplace, account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketplace_listing_variants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id BIGINT UNSIGNED NOT NULL,
  local_sku VARCHAR(160) NOT NULL,
  marketplace_sku VARCHAR(160) NOT NULL,
  variant_name VARCHAR(255) NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  raw_json JSON NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_listing_variants_listing (listing_id),
  KEY idx_listing_variants_sku (local_sku),
  CONSTRAINT fk_listing_variants_listing FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketplace_listing_attributes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id BIGINT UNSIGNED NOT NULL,
  attribute_name VARCHAR(160) NOT NULL,
  attribute_value TEXT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  source VARCHAR(30) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_listing_attributes_listing (listing_id),
  CONSTRAINT fk_listing_attributes_listing FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketplace_listing_prices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  listing_id BIGINT UNSIGNED NULL,
  marketplace ENUM('DARAZ','WOO','AMAZON','EBAY','LOCAL') NOT NULL,
  account_id BIGINT UNSIGNED NULL,
  local_sku VARCHAR(160) NOT NULL,
  marketplace_sku VARCHAR(160) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
  current_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  min_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  max_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  shipping_paid_by_buyer DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  marketplace_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ppc_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  promotion_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  courier_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  packaging_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  product_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  target_margin_percent DECIMAL(8,2) NOT NULL DEFAULT 20.00,
  suggested_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  profit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  margin_percent DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  status ENUM('good','low_margin','loss','need_review') NOT NULL DEFAULT 'need_review',
  last_calculated_at DATETIME NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_listing_prices_sku (local_sku),
  KEY idx_listing_prices_marketplace (marketplace, account_id),
  KEY idx_listing_prices_listing (listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketplace_price_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  price_id BIGINT UNSIGNED NULL,
  local_sku VARCHAR(160) NOT NULL,
  marketplace ENUM('DARAZ','WOO','AMAZON','EBAY','LOCAL') NOT NULL,
  old_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  new_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  reason VARCHAR(255) NULL,
  changed_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_price_history_sku (local_sku),
  KEY idx_price_history_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketplace_fee_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  marketplace ENUM('DARAZ','WOO','AMAZON','EBAY','LOCAL') NOT NULL,
  category_id VARCHAR(120) NULL,
  category_name VARCHAR(255) NULL,
  commission_percent DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  payment_fee_percent DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  fixed_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fee_rules_marketplace (marketplace, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_cost_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  local_sku VARCHAR(160) NOT NULL,
  supplier_id BIGINT UNSIGNED NULL,
  old_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  new_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  reason VARCHAR(255) NULL,
  changed_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cost_history_sku (local_sku),
  KEY idx_cost_history_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS price_calculation_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_uid VARCHAR(80) NOT NULL,
  status ENUM('running','success','failed') NOT NULL DEFAULT 'running',
  total_items INT NOT NULL DEFAULT 0,
  success_items INT NOT NULL DEFAULT 0,
  failed_items INT NOT NULL DEFAULT 0,
  note TEXT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_price_calc_run_uid (run_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS price_calculation_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id BIGINT UNSIGNED NOT NULL,
  local_sku VARCHAR(160) NOT NULL,
  marketplace ENUM('DARAZ','WOO','AMAZON','EBAY','LOCAL') NOT NULL,
  current_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  profit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  margin_percent DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  suggested_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(80) NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_price_calc_items_run (run_id),
  KEY idx_price_calc_items_sku (local_sku),
  CONSTRAINT fk_price_calc_items_run FOREIGN KEY (run_id) REFERENCES price_calculation_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sku_sales_daily (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sales_date DATE NOT NULL,
  local_sku VARCHAR(160) NOT NULL,
  marketplace ENUM('DARAZ','WOO','MANUAL','LOCAL','OTHER') NOT NULL DEFAULT 'LOCAL',
  account_id BIGINT UNSIGNED NULL,
  units_sold INT NOT NULL DEFAULT 0,
  order_count INT NOT NULL DEFAULT 0,
  gross_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ppc_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  promotion_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  fee_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sku_sales_daily (sales_date, local_sku, marketplace, account_id),
  KEY idx_sku_sales_sku_date (local_sku, sales_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sku_economics_daily (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_date DATE NOT NULL,
  local_sku VARCHAR(160) NOT NULL,
  units_sold INT NOT NULL DEFAULT 0,
  revenue DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  product_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  fees DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ppc_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  promotion_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  profit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  margin_percent DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  stock_qty INT NOT NULL DEFAULT 0,
  days_of_cover DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  issues_json JSON NULL,
  recommendations_json JSON NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sku_economics_daily (report_date, local_sku),
  KEY idx_sku_economics_sku_date (local_sku, report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS net_sales_daily (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sales_date DATE NOT NULL,
  channel ENUM('DARAZ','WOO','MANUAL','LOCAL','OTHER','ALL') NOT NULL DEFAULT 'ALL',
  gross_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  product_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  fees DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ppc_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  promotion_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  courier_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  packaging_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  profit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  order_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_net_sales_daily (sales_date, channel),
  KEY idx_net_sales_daily_date (sales_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_report_daily (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_date DATE NOT NULL,
  total_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  profit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  order_count INT NOT NULL DEFAULT 0,
  low_stock_count INT NOT NULL DEFAULT 0,
  out_of_stock_count INT NOT NULL DEFAULT 0,
  sync_success_count INT NOT NULL DEFAULT 0,
  sync_failed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_business_report_daily (report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS demand_forecasts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  local_sku VARCHAR(160) NOT NULL,
  forecast_date DATE NOT NULL,
  sales_30_days INT NOT NULL DEFAULT 0,
  sales_60_days INT NOT NULL DEFAULT 0,
  sales_90_days INT NOT NULL DEFAULT 0,
  average_daily_sales DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  available_stock INT NOT NULL DEFAULT 0,
  supplier_lead_time_days INT NOT NULL DEFAULT 7,
  safety_days INT NOT NULL DEFAULT 7,
  suggested_reorder_qty INT NOT NULL DEFAULT 0,
  priority ENUM('urgent','need_order','good','slow_moving') NOT NULL DEFAULT 'good',
  reason TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_demand_forecasts (forecast_date, local_sku),
  KEY idx_demand_forecast_sku (local_sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS image_dashboard_checks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  local_sku VARCHAR(160) NOT NULL,
  product_name VARCHAR(255) NULL,
  image_url TEXT NULL,
  image_type ENUM('main','gallery','variant','marketplace') NOT NULL DEFAULT 'main',
  width INT NULL,
  height INT NULL,
  marketplace ENUM('DARAZ','WOO','LOCAL','OTHER') NOT NULL DEFAULT 'LOCAL',
  check_type ENUM('missing_main','low_resolution','non_white_background','duplicate','variant_missing','marketplace_missing','sync_failed','ok') NOT NULL DEFAULT 'ok',
  status ENUM('pass','warning','fail') NOT NULL DEFAULT 'pass',
  message TEXT NULL,
  checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_image_checks_sku (local_sku),
  KEY idx_image_checks_status (status),
  KEY idx_image_checks_type (check_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS image_sync_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  local_sku VARCHAR(160) NOT NULL,
  marketplace ENUM('DARAZ','WOO','LOCAL','OTHER') NOT NULL DEFAULT 'LOCAL',
  account_id BIGINT UNSIGNED NULL,
  image_url TEXT NULL,
  action VARCHAR(80) NULL,
  status ENUM('success','failed','pending') NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  request_payload JSON NULL,
  response_payload JSON NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_image_sync_sku (local_sku),
  KEY idx_image_sync_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
  module_name VARCHAR(80) NULL,
  reference_id VARCHAR(120) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_read (is_read),
  KEY idx_notifications_module (module_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sync_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_uid VARCHAR(120) NOT NULL,
  module_name VARCHAR(80) NOT NULL,
  account_code VARCHAR(80) NULL,
  status ENUM('running','success','failed','partial') NOT NULL DEFAULT 'running',
  total_count INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  summary_message TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sync_runs_uid (run_uid),
  KEY idx_sync_runs_module (module_name),
  KEY idx_sync_runs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sync_run_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id BIGINT UNSIGNED NOT NULL,
  reference_key VARCHAR(180) NULL,
  status ENUM('success','failed','skipped') NOT NULL DEFAULT 'success',
  message TEXT NULL,
  request_payload JSON NULL,
  response_payload JSON NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sync_run_items_run (run_id),
  CONSTRAINT fk_sync_items_run FOREIGN KEY (run_id) REFERENCES sync_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_error_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_uid VARCHAR(160) NULL,
  marketplace ENUM('DARAZ','WOO','LOCAL','OTHER') NOT NULL DEFAULT 'LOCAL',
  account_code VARCHAR(80) NULL,
  api_path VARCHAR(255) NULL,
  http_method VARCHAR(20) NULL,
  status_code INT NULL,
  error_code VARCHAR(120) NULL,
  error_message TEXT NULL,
  request_id VARCHAR(120) NULL,
  trace_id VARCHAR(120) NULL,
  request_payload JSON NULL,
  response_payload JSON NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_api_error_marketplace (marketplace, account_code),
  KEY idx_api_error_created (created_at),
  KEY idx_api_error_request_trace (request_id, trace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketplace_transfer_jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  local_product_id BIGINT UNSIGNED NULL,
  local_sku VARCHAR(160) NULL,
  marketplace ENUM('DARAZ','WOO') NOT NULL,
  account_id BIGINT UNSIGNED NULL,
  category_id VARCHAR(120) NULL,
  payload_json JSON NULL,
  status ENUM('draft','pending','success','failed') NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transfer_jobs_sku (local_sku),
  KEY idx_transfer_jobs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO warehouses (warehouse_code, warehouse_name, location, status)
VALUES ('MAIN', 'Main Warehouse', 'Default warehouse', 'active');

SET FOREIGN_KEY_CHECKS=1;

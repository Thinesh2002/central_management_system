/*
  Central Management System - Phase 4 Professional Operations Upgrade
  Run this after database_upgrade_phase3_erp.sql.
  Safe for existing databases: CREATE TABLE IF NOT EXISTS + non-destructive columns/indexes.
*/

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_code` VARCHAR(80) NOT NULL,
  `role_name` VARCHAR(140) NOT NULL,
  `description` TEXT NULL,
  `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  `status` ENUM('active','inactive','deleted') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_code` (`role_code`),
  KEY `idx_roles_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `permission_code` VARCHAR(120) NOT NULL,
  `permission_name` VARCHAR(180) NOT NULL,
  `module_name` VARCHAR(80) NOT NULL,
  `action_name` VARCHAR(80) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('active','inactive','deleted') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_code` (`permission_code`),
  KEY `idx_permissions_module` (`module_name`,`action_name`),
  KEY `idx_permissions_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `permission_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_permission` (`role_id`,`permission_id`),
  KEY `idx_role_permissions_permission` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `assigned_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_role` (`user_id`,`role_id`),
  KEY `idx_user_roles_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_uid` VARCHAR(80) NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `user_name` VARCHAR(160) NULL,
  `module_name` VARCHAR(80) NOT NULL,
  `action_name` VARCHAR(80) NOT NULL,
  `entity_type` VARCHAR(100) NULL,
  `entity_id` VARCHAR(100) NULL,
  `old_value_json` JSON NULL,
  `new_value_json` JSON NULL,
  `ip_address` VARCHAR(80) NULL,
  `user_agent` TEXT NULL,
  `status` ENUM('success','failed') NOT NULL DEFAULT 'success',
  `message` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_module_action` (`module_name`,`action_name`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `backup_runs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `backup_uid` VARCHAR(100) NOT NULL,
  `backup_type` ENUM('manual','daily','before_migration') NOT NULL DEFAULT 'manual',
  `database_name` VARCHAR(120) NULL,
  `file_name` VARCHAR(255) NULL,
  `file_path` VARCHAR(600) NULL,
  `file_size_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('pending','running','success','failed') NOT NULL DEFAULT 'pending',
  `message` TEXT NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `started_at` DATETIME NULL,
  `finished_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_backup_uid` (`backup_uid`),
  KEY `idx_backup_status` (`status`),
  KEY `idx_backup_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `migration_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration_uid` VARCHAR(100) NOT NULL,
  `migration_name` VARCHAR(180) NOT NULL,
  `sql_hash` VARCHAR(80) NULL,
  `sql_text` MEDIUMTEXT NULL,
  `status` ENUM('pending','running','success','failed') NOT NULL DEFAULT 'pending',
  `message` TEXT NULL,
  `executed_by` BIGINT UNSIGNED NULL,
  `started_at` DATETIME NULL,
  `finished_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_migration_uid` (`migration_uid`),
  KEY `idx_migration_status` (`status`),
  KEY `idx_migration_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_profit_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_source` ENUM('MANUAL','DARAZ','WOO','OTHER') NOT NULL DEFAULT 'MANUAL',
  `account_id` BIGINT UNSIGNED NULL,
  `account_code` VARCHAR(80) NULL,
  `order_id` VARCHAR(120) NOT NULL,
  `order_number` VARCHAR(140) NULL,
  `order_date` DATETIME NULL,
  `gross_sales` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `shipping_paid_by_buyer` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `marketplace_fees` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_fees` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `promotion_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `ppc_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `courier_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `packaging_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `refund_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `product_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `net_sales` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `net_profit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `margin_percent` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('profit','low_margin','loss','review') NOT NULL DEFAULT 'review',
  `calculated_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_order_profit_source_order` (`order_source`,`order_id`),
  KEY `idx_order_profit_source` (`order_source`,`account_code`),
  KEY `idx_order_profit_date` (`order_date`),
  KEY `idx_order_profit_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_profit_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `report_id` BIGINT UNSIGNED NOT NULL,
  `local_sku` VARCHAR(120) NULL,
  `marketplace_sku` VARCHAR(160) NULL,
  `product_name` VARCHAR(255) NULL,
  `qty` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `product_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `fees` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `net_profit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_profit_items_report` (`report_id`),
  KEY `idx_order_profit_items_sku` (`local_sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `return_refunds` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `return_uid` VARCHAR(100) NOT NULL,
  `order_source` ENUM('MANUAL','DARAZ','WOO','OTHER') NOT NULL DEFAULT 'MANUAL',
  `order_id` VARCHAR(120) NULL,
  `order_number` VARCHAR(140) NULL,
  `local_sku` VARCHAR(120) NULL,
  `marketplace_sku` VARCHAR(160) NULL,
  `qty` INT NOT NULL DEFAULT 1,
  `refund_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `return_shipping_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `condition_status` ENUM('new','used','damaged','missing','unknown') NOT NULL DEFAULT 'unknown',
  `restock` TINYINT(1) NOT NULL DEFAULT 0,
  `restocked_qty` INT NOT NULL DEFAULT 0,
  `reason` VARCHAR(255) NULL,
  `note` TEXT NULL,
  `status` ENUM('requested','received','refunded','closed','rejected') NOT NULL DEFAULT 'requested',
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_return_uid` (`return_uid`),
  KEY `idx_return_order` (`order_source`,`order_id`),
  KEY `idx_return_sku` (`local_sku`),
  KEY `idx_return_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `courier_accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `courier_code` VARCHAR(80) NOT NULL,
  `courier_name` VARCHAR(160) NOT NULL,
  `api_base_url` VARCHAR(255) NULL,
  `api_key_encrypted` TEXT NULL,
  `default_service_type` VARCHAR(100) NULL,
  `status` ENUM('active','inactive','deleted') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_courier_code` (`courier_code`),
  KEY `idx_courier_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `courier_shipments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shipment_uid` VARCHAR(100) NOT NULL,
  `courier_account_id` BIGINT UNSIGNED NULL,
  `order_source` ENUM('MANUAL','DARAZ','WOO','OTHER') NOT NULL DEFAULT 'MANUAL',
  `order_id` VARCHAR(120) NULL,
  `order_number` VARCHAR(140) NULL,
  `tracking_number` VARCHAR(180) NULL,
  `waybill_url` VARCHAR(600) NULL,
  `customer_name` VARCHAR(180) NULL,
  `customer_phone` VARCHAR(80) NULL,
  `delivery_address` TEXT NULL,
  `cod_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `courier_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `collected_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('draft','created','picked_up','in_transit','delivered','returned','cancelled','failed') NOT NULL DEFAULT 'draft',
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shipment_uid` (`shipment_uid`),
  UNIQUE KEY `uq_tracking_number` (`tracking_number`),
  KEY `idx_shipments_order` (`order_source`,`order_id`),
  KEY `idx_shipments_status` (`status`),
  KEY `idx_shipments_courier` (`courier_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `courier_shipment_status_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shipment_id` BIGINT UNSIGNED NOT NULL,
  `old_status` VARCHAR(80) NULL,
  `new_status` VARCHAR(80) NOT NULL,
  `message` TEXT NULL,
  `raw_response_json` JSON NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shipment_status_logs_shipment` (`shipment_id`),
  KEY `idx_shipment_status_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cod_reconciliations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shipment_id` BIGINT UNSIGNED NOT NULL,
  `expected_cod` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `received_cod` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `difference_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending','matched','short','over','resolved') NOT NULL DEFAULT 'pending',
  `note` TEXT NULL,
  `reconciled_by` BIGINT UNSIGNED NULL,
  `reconciled_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cod_shipment` (`shipment_id`),
  KEY `idx_cod_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bulk_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_uid` VARCHAR(100) NOT NULL,
  `job_type` ENUM('product_import','stock_import','price_import','image_import','product_export','sales_export','inventory_export') NOT NULL,
  `file_name` VARCHAR(255) NULL,
  `file_path` VARCHAR(600) NULL,
  `total_rows` INT NOT NULL DEFAULT 0,
  `success_rows` INT NOT NULL DEFAULT 0,
  `failed_rows` INT NOT NULL DEFAULT 0,
  `status` ENUM('pending','running','success','failed','partial') NOT NULL DEFAULT 'pending',
  `message` TEXT NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `started_at` DATETIME NULL,
  `finished_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bulk_job_uid` (`job_uid`),
  KEY `idx_bulk_job_type` (`job_type`),
  KEY `idx_bulk_job_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bulk_job_rows` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_id` BIGINT UNSIGNED NOT NULL,
  `row_number` INT NOT NULL,
  `row_json` JSON NULL,
  `status` ENUM('pending','success','failed','skipped') NOT NULL DEFAULT 'pending',
  `message` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bulk_rows_job` (`job_id`),
  KEY `idx_bulk_rows_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_quality_scores` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `local_sku` VARCHAR(120) NOT NULL,
  `product_name` VARCHAR(255) NULL,
  `score` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `title_score` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `category_score` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `attribute_score` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `image_score` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `stock_score` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `price_score` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `supplier_score` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('excellent','good','needs_work','bad') NOT NULL DEFAULT 'needs_work',
  `issue_count` INT NOT NULL DEFAULT 0,
  `last_checked_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_quality_sku` (`local_sku`),
  KEY `idx_product_quality_status` (`status`),
  KEY `idx_product_quality_score` (`score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_quality_issues` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `local_sku` VARCHAR(120) NOT NULL,
  `issue_type` VARCHAR(80) NOT NULL,
  `severity` ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `message` TEXT NOT NULL,
  `fix_route` VARCHAR(255) NULL,
  `status` ENUM('open','fixed','ignored') NOT NULL DEFAULT 'open',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quality_issues_sku` (`local_sku`),
  KEY `idx_quality_issues_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sync_job_queue` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `queue_uid` VARCHAR(100) NOT NULL,
  `job_type` VARCHAR(100) NOT NULL,
  `module_name` VARCHAR(80) NOT NULL,
  `priority` ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `payload_json` JSON NULL,
  `attempt_count` INT NOT NULL DEFAULT 0,
  `max_attempts` INT NOT NULL DEFAULT 3,
  `status` ENUM('pending','running','success','failed','cancelled') NOT NULL DEFAULT 'pending',
  `message` TEXT NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `scheduled_at` DATETIME NULL,
  `started_at` DATETIME NULL,
  `finished_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_queue_uid` (`queue_uid`),
  KEY `idx_queue_status` (`status`,`priority`),
  KEY `idx_queue_type` (`module_name`,`job_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications table may already exist in Phase 3. Add commonly needed fields safely where possible.
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
  `module_name` VARCHAR(80) NULL,
  `title` VARCHAR(180) NOT NULL,
  `message` TEXT NULL,
  `action_route` VARCHAR(255) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_read` (`is_read`,`created_at`),
  KEY `idx_notifications_module` (`module_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `roles` (`role_code`, `role_name`, `description`, `is_system`) VALUES
('SUPER_ADMIN','Super Admin','Full system access.',1),
('ADMIN','Admin','Manage users, products, orders, finance, reports.',1),
('PRODUCT_MANAGER','Product Manager','Manage product, image, pricing, and quality modules.',1),
('INVENTORY_MANAGER','Inventory Manager','Manage stock, suppliers, courier, and warehouse modules.',1),
('ORDER_STAFF','Order Staff','Manage order processing, returns, and courier shipment work.',1),
('FINANCE_STAFF','Finance Staff','View finance, order profit, net sales, and P&L reports.',1),
('VIEWER','Viewer','Read-only dashboard access.',1);

INSERT IGNORE INTO `permissions` (`permission_code`, `permission_name`, `module_name`, `action_name`, `description`) VALUES
('DASHBOARD_VIEW','View Dashboard','dashboard','view','Open business dashboard.'),
('PRODUCT_VIEW','View Products','products','view','Open product pages.'),
('PRODUCT_EDIT','Edit Products','products','edit','Create and edit products.'),
('PRICE_VIEW','View Price Dashboard','pricing','view','Open price dashboard.'),
('PRICE_EDIT','Edit Prices','pricing','edit','Run price calculations and update marketplace prices.'),
('INVENTORY_VIEW','View Inventory','inventory','view','Open inventory pages.'),
('INVENTORY_EDIT','Edit Inventory','inventory','edit','Create stock adjustments and push stock.'),
('ORDER_VIEW','View Orders','orders','view','Open order pages.'),
('ORDER_EDIT','Edit Orders','orders','edit','Change order status and packing work.'),
('FINANCE_VIEW','View Finance','finance','view','Open finance reports.'),
('SUPPLIER_VIEW','View Suppliers','suppliers','view','Open supplier pages.'),
('SUPPLIER_EDIT','Edit Suppliers','suppliers','edit','Create and edit supplier/purchase order data.'),
('COURIER_VIEW','View Courier','courier','view','Open courier dashboard.'),
('COURIER_EDIT','Edit Courier','courier','edit','Create shipments and COD reconciliation.'),
('BULK_TOOLS','Use Bulk Tools','bulk','manage','Import/export bulk data.'),
('SYSTEM_AUDIT','View Audit Logs','system','audit','Open audit logs.'),
('SYSTEM_BACKUP','Run Backup','system','backup','Run and download backups.'),
('SYSTEM_MIGRATION','Run Migration','system','migration','Run safe database migrations.'),
('USER_ACCESS','Manage User Access','users','access','Manage roles and permissions.');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.role_code IN ('SUPER_ADMIN','ADMIN');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.role_code = 'PRODUCT_MANAGER' AND p.permission_code IN ('DASHBOARD_VIEW','PRODUCT_VIEW','PRODUCT_EDIT','PRICE_VIEW','PRICE_EDIT','INVENTORY_VIEW','SUPPLIER_VIEW');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.role_code = 'INVENTORY_MANAGER' AND p.permission_code IN ('DASHBOARD_VIEW','PRODUCT_VIEW','INVENTORY_VIEW','INVENTORY_EDIT','SUPPLIER_VIEW','SUPPLIER_EDIT','COURIER_VIEW','COURIER_EDIT');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.role_code = 'ORDER_STAFF' AND p.permission_code IN ('DASHBOARD_VIEW','ORDER_VIEW','ORDER_EDIT','COURIER_VIEW','COURIER_EDIT','INVENTORY_VIEW');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.role_code = 'FINANCE_STAFF' AND p.permission_code IN ('DASHBOARD_VIEW','FINANCE_VIEW','PRICE_VIEW','ORDER_VIEW','SUPPLIER_VIEW');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.role_code = 'VIEWER' AND p.permission_code IN ('DASHBOARD_VIEW','PRODUCT_VIEW','INVENTORY_VIEW','ORDER_VIEW','FINANCE_VIEW','SUPPLIER_VIEW');

SET FOREIGN_KEY_CHECKS = 1;

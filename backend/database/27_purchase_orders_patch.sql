-- =====================================================================
-- 27_purchase_orders_patch.sql
-- Phase 2 continued: Purchase Orders, built on top of Supplier Management.
-- Lives in the same cm_supplier_management database (procurement domain,
-- not a separate feature-per-database split) - GRN and Cost Price History
-- will follow the same pattern.
--
-- Unlike Suppliers, Purchase Orders is delegable via the normal
-- user_permissions/Access Control system (page_key "purchase_orders") -
-- master_admin can grant admin/user view/edit/delete access same as any
-- other module. Routes use protect + requirePermission, not a hard
-- master_admin check.
--
-- Run this after 26_supplier_management_patch.sql.
-- =====================================================================

USE cm_supplier_management;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  po_number               VARCHAR(50) NOT NULL UNIQUE,
  supplier_id             BIGINT UNSIGNED NOT NULL,
  status                  ENUM('draft', 'pending', 'approved', 'sent', 'partially_received', 'received', 'cancelled') NOT NULL DEFAULT 'draft',
  order_date              DATE NOT NULL,
  expected_delivery_date  DATE NULL,
  currency                VARCHAR(10) NOT NULL DEFAULT 'LKR',
  subtotal_amount         DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  tax_amount              DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  shipping_amount         DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_amount            DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  notes                   TEXT NULL,
  created_by              BIGINT UNSIGNED NULL,
  updated_by              BIGINT UNSIGNED NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at               TIMESTAMP NULL DEFAULT NULL,

  CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  KEY idx_po_status (status),
  KEY idx_po_supplier (supplier_id),
  KEY idx_po_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id       BIGINT UNSIGNED NOT NULL,
  sku                     VARCHAR(100) NOT NULL,
  product_name            VARCHAR(255) NULL,
  quantity_ordered        INT UNSIGNED NOT NULL,
  quantity_received       INT UNSIGNED NOT NULL DEFAULT 0,
  unit_cost               DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  line_total              DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_poi_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  KEY idx_poi_po (purchase_order_id),
  KEY idx_poi_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('purchase_orders', 'Purchase Orders', '/purchase-orders', 'ClipboardList', 6, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

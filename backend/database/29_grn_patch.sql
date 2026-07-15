-- =====================================================================
-- 29_grn_patch.sql
-- Phase 2 continued: Goods Received Notes (GRN) - the receiving step
-- that closes the loop on a Purchase Order. Lives in cm_supplier_management
-- alongside suppliers/purchase_orders (same procurement domain).
--
-- A GRN is an immutable record of what physically arrived - no edit or
-- delete in v1 (correcting a mis-receipt is a future "stock adjustment"
-- feature, not a GRN edit). Delegable via Access Control, page_key "grn".
--
-- Run this after 28_supplier_bank_details_patch.sql.
-- =====================================================================

USE cm_supplier_management;

CREATE TABLE IF NOT EXISTS goods_received_notes (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grn_number          VARCHAR(50) NOT NULL UNIQUE,
  purchase_order_id   BIGINT UNSIGNED NOT NULL,
  supplier_id         BIGINT UNSIGNED NOT NULL,
  received_date       DATE NOT NULL,
  notes               TEXT NULL,
  created_by          BIGINT UNSIGNED NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_grn_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  CONSTRAINT fk_grn_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  KEY idx_grn_po (purchase_order_id),
  KEY idx_grn_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goods_received_note_items (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grn_id                  BIGINT UNSIGNED NOT NULL,
  purchase_order_item_id  BIGINT UNSIGNED NOT NULL,
  sku                     VARCHAR(100) NOT NULL,
  product_name            VARCHAR(255) NULL,
  quantity_received       INT UNSIGNED NOT NULL,
  unit_cost               DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_grni_grn FOREIGN KEY (grn_id) REFERENCES goods_received_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_grni_poi FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id),
  KEY idx_grni_grn (grn_id),
  KEY idx_grni_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('grn', 'Goods Received Notes', '/goods-received', 'Boxes', 7, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

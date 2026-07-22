-- =====================================================================
-- 41_remove_purchase_orders_grn_patch.sql
-- Removes Purchase Orders and Goods Received Notes entirely, per explicit
-- request: procurement stays supplier-detail-only from here on, and stock
-- receiving is done directly on the Inventory Dashboard (which now also
-- logs cost price changes to price_history and pushes to Daraz/Woo -
-- the same things GRN used to do, moved to product_inventory_controller.js).
--
-- Drop order respects FKs: goods_received_note_items -> goods_received_notes
-- -> purchase_order_items -> purchase_orders. suppliers itself is untouched.
-- =====================================================================

USE cm_supplier_management;

DROP TABLE IF EXISTS goods_received_note_items;
DROP TABLE IF EXISTS goods_received_notes;
DROP TABLE IF EXISTS purchase_order_items;
DROP TABLE IF EXISTS purchase_orders;

USE cm_auth_management;

DELETE FROM app_pages WHERE page_key IN ('purchase_orders', 'grn');

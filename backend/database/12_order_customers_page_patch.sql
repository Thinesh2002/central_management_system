-- =====================================================================
-- 12_order_customers_page_patch.sql
-- Registers the Customers view page (cm_order_management.customers is an
-- external, pre-existing table owned by the order-sync pipeline — this
-- patch only adds the page registration for Access Control, no DDL on
-- cm_order_management itself).
-- Run this after 01 to 11 database setup files.
-- =====================================================================

USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('order_customers', 'Customers', '/order-management/customers', 'Users', 140, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

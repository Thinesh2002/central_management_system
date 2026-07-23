-- =====================================================================
-- 43_daraz_finance_split_pages_patch.sql
-- Splits the single "Daraz Finance" page (Payouts/Transactions tabs)
-- into two separate sidebar pages/routes: Transactions and Income.
-- The old 'daraz_finance' app_pages row is left in place (its
-- route_path now redirects client-side) so existing permission grants
-- aren't lost; the two new page_keys get default permissions synced
-- automatically on next backend restart via ensureAllUserPermissions().
-- =====================================================================

USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('daraz_finance_transactions', 'Transactions', '/order-management/finance/transactions', 'DollarSign', 146, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name), route_path = VALUES(route_path);

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('daraz_finance_income', 'Income', '/order-management/finance/income', 'Wallet', 147, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name), route_path = VALUES(route_path);

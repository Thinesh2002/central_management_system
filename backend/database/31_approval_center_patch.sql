-- =====================================================================
-- 31_approval_center_patch.sql
-- Phase 3, first piece: Approval Center. No new tables - lifecycle
-- state (blocked_low_score / pending_approval / published / rejected)
-- is derived at read time from the existing daraz_content_suggestions
-- status + scores_json.overall (see approval_center_controller.js),
-- and approve/reject delegate straight into the existing Daraz Content
-- Optimizer's applyDescription()/reject() handlers rather than
-- duplicating the publish logic.
--
-- Delegable via Access Control, page_key "approval_center".
--
-- Run this after 30_price_rules_patch.sql.
-- =====================================================================

USE cm_auth_management;

INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status)
VALUES ('approval_center', 'Approval Center', '/approval-center', 'ListChecks', 9, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

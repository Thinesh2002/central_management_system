-- =====================================================================
-- 42_remove_content_optimizer_approval_center_patch.sql
-- Removes the AI Content Optimizer and Approval Center entirely, per
-- explicit request: only the Daraz Title Optimizer AI stays. Approval
-- Center had no table of its own (derived its lifecycle state from
-- daraz_content_suggestions at read time), so removing Content
-- Optimizer's data removes Approval Center's basis too - confirmed
-- with the user.
-- =====================================================================

USE cm_product_management;

DROP TABLE IF EXISTS daraz_content_suggestions;

USE cm_logs_management;

DROP TABLE IF EXISTS daraz_content_optimizer_logs;

USE cm_auth_management;

DELETE FROM app_pages WHERE page_key IN ('ai_content_optimizer', 'approval_center');

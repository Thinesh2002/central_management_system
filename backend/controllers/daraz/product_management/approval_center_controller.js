const contentSuggestionModel = require("../../../models/daraz/product_management/daraz_content_suggestion_model");
const accountModel = require("../../../models/marketplace/account_model");
const contentOptimizerController = require("./daraz_content_optimizer_controller");

// Product Lifecycle gate from the design doc: a suggestion can't move to
// pending_approval below this score - it stays "blocked" with its failed
// checks surfaced instead. No stored lifecycle_state column - this is
// derived from daraz_content_suggestions.status + scores_json.overall so
// the existing content optimizer table/flow doesn't need to change.
const APPROVAL_SCORE_THRESHOLD = 90;

function deriveLifecycleState(row) {
  if (row.status === "rejected") return "rejected";
  if (row.status === "failed") return "failed";
  if (row.status === "partially_applied" || row.status === "applied") return "published";

  const overall = Number(row.scores_json?.overall);
  if (!Number.isFinite(overall)) return "ai_optimized";

  return overall >= APPROVAL_SCORE_THRESHOLD ? "pending_approval" : "blocked_low_score";
}

async function list(req, res) {
  try {
    const { account_id: accountId, limit } = req.query || {};

    const rows = await contentSuggestionModel.list({
      account_id: accountId,
      status: "pending",
      limit: limit || 200,
    });

    const accountIds = [...new Set(rows.map((r) => r.account_id).filter(Boolean))];
    const accounts = await Promise.all(accountIds.map((id) => accountModel.getAccountById(id).catch(() => null)));
    const accountNameById = new Map(accounts.filter(Boolean).map((a) => [a.id, a.account_name]));

    const data = rows.map((row) => ({
      ...row,
      account_name: accountNameById.get(row.account_id) || null,
      overall_score: Number.isFinite(Number(row.scores_json?.overall)) ? Number(row.scores_json.overall) : null,
      lifecycle_state: deriveLifecycleState(row),
    }));

    return res.json({
      success: true,
      data,
      summary: {
        pending_approval: data.filter((r) => r.lifecycle_state === "pending_approval").length,
        blocked_low_score: data.filter((r) => r.lifecycle_state === "blocked_low_score").length,
      },
    });
  } catch (error) {
    console.error("[APPROVAL_CENTER_LIST_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to load the approval queue." });
  }
}

// Approve = the doc's "one click: Approve -> Publish" - enforces the
// quality gate here, then delegates straight into the existing content
// optimizer's applyDescription() so the actual Daraz push logic lives in
// exactly one place.
async function approve(req, res) {
  try {
    const suggestion = await contentSuggestionModel.findById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({ success: false, message: "Suggestion not found." });
    }

    const overall = Number(suggestion.scores_json?.overall);

    if (!Number.isFinite(overall) || overall < APPROVAL_SCORE_THRESHOLD) {
      return res.status(400).json({
        success: false,
        message: `AI quality score (${Number.isFinite(overall) ? overall : "n/a"}/100) is below the ${APPROVAL_SCORE_THRESHOLD} approval threshold. Rework the content before approving.`,
      });
    }

    return contentOptimizerController.applyDescription(req, res);
  } catch (error) {
    console.error("[APPROVAL_CENTER_APPROVE_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to approve suggestion." });
  }
}

async function reject(req, res) {
  return contentOptimizerController.reject(req, res);
}

module.exports = { list, approve, reject };

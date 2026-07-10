const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");
const titleSuggestionModel = require("../../../models/daraz/product_management/daraz_title_suggestion_model");
const titleOptimizerLogModel = require("../../../models/daraz/product_management/daraz_title_optimizer_log_model");
const titleScanService = require("../../../services/daraz/product_management/daraz_title_scan_service");
const darazProductApiService = require("../../../services/marketplace/daraz_product_api_service");
const darazProductSyncModel = require("../../../models/daraz/product_management/daraz_product_sync_model");

async function scan(req, res) {
  try {
    const { accountId, limit, mode, staleDays } = req.body || {};

    if (!accountId) {
      return res.status(400).json({ success: false, message: "accountId is required." });
    }

    const result = await titleScanService.scanAccountForTitleSuggestions({
      accountId,
      limit: limit || 50,
      userId: req.user?.id || null,
      mode: mode === "stale" ? "stale" : "manual",
      staleDays: staleDays || 30,
    });

    return res.json({ success: true, message: "Scan completed.", data: result });
  } catch (error) {
    console.error("[DARAZ_TITLE_SCAN_ERROR]", { message: error?.message });

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to scan products for title suggestions.",
    });
  }
}

async function listSuggestions(req, res) {
  try {
    const { account_id: accountId, status, scan_batch_id: scanBatchId, limit } = req.query || {};

    const data = await titleSuggestionModel.list({
      account_id: accountId,
      status,
      scan_batch_id: scanBatchId,
      limit,
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[DARAZ_TITLE_LIST_ERROR]", { message: error?.message });

    return res.status(500).json({ success: false, message: "Failed to load title suggestions." });
  }
}

async function approveSuggestion(req, res) {
  try {
    const { id } = req.params;
    const suggestion = await titleSuggestionModel.findById(id);

    if (!suggestion) {
      return res.status(404).json({ success: false, message: "Suggestion not found." });
    }

    const canRetry = suggestion.status === "failed" && suggestion.suggested_title;

    if (suggestion.status !== "pending" && !canRetry) {
      return res.status(400).json({ success: false, message: `Suggestion is already ${suggestion.status}.` });
    }

    const account = await accountModel.findById(suggestion.account_id);
    const credentials = await credentialModel.findByAccountId(suggestion.account_id);

    if (!account || !credentials?.access_token) {
      return res.status(400).json({ success: false, message: "Daraz account credentials missing." });
    }

    const product = await darazProductSyncModel.getPreviewById(suggestion.daraz_product_id);

    await darazProductApiService.updateDarazProductDetails({
      account,
      credentials,
      itemId: suggestion.daraz_item_id,
      primaryCategory: product?.primary_category || null,
      sellerSku: suggestion.seller_sku,
      name: suggestion.suggested_title,
      brand: product?.brand || null,
    });

    const updated = await titleSuggestionModel.updateStatus(id, {
      status: "applied",
      reviewed_by: req.user?.id || null,
      applied_at: new Date(),
    });

    await titleOptimizerLogModel.logTitleApplied({
      account_id: suggestion.account_id,
      suggestion_id: suggestion.id,
      seller_sku: suggestion.seller_sku,
      old_title: suggestion.original_title,
      new_title: suggestion.suggested_title,
      status: "success",
    });

    return res.json({ success: true, message: "Title applied to Daraz.", data: updated });
  } catch (error) {
    console.error("[DARAZ_TITLE_APPROVE_ERROR]", { message: error?.message });

    const failedSuggestion = await titleSuggestionModel.updateStatus(req.params.id, {
      status: "failed",
      reviewed_by: req.user?.id || null,
      error_message: error.message,
    });

    await titleOptimizerLogModel.logTitleApplied({
      account_id: failedSuggestion?.account_id,
      suggestion_id: failedSuggestion?.id,
      seller_sku: failedSuggestion?.seller_sku,
      old_title: failedSuggestion?.original_title,
      new_title: failedSuggestion?.suggested_title,
      status: "failed",
      message: error.message,
    });

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to apply title to Daraz.",
    });
  }
}

async function rejectSuggestion(req, res) {
  try {
    const { id } = req.params;
    const suggestion = await titleSuggestionModel.findById(id);

    if (!suggestion) {
      return res.status(404).json({ success: false, message: "Suggestion not found." });
    }

    const updated = await titleSuggestionModel.updateStatus(id, {
      status: "rejected",
      reviewed_by: req.user?.id || null,
    });

    return res.json({ success: true, message: "Suggestion rejected.", data: updated });
  } catch (error) {
    console.error("[DARAZ_TITLE_REJECT_ERROR]", { message: error?.message });

    return res.status(500).json({ success: false, message: "Failed to reject suggestion." });
  }
}

module.exports = { scan, listSuggestions, approveSuggestion, rejectSuggestion };

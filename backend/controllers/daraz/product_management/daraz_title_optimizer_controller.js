const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");
const titleSuggestionModel = require("../../../models/daraz/product_management/daraz_title_suggestion_model");
const titleOptimizerLogModel = require("../../../models/daraz/product_management/daraz_title_optimizer_log_model");
const titleScanService = require("../../../services/daraz/product_management/daraz_title_scan_service");
const darazProductApiService = require("../../../services/marketplace/daraz_product_api_service");
const darazProductSyncModel = require("../../../models/daraz/product_management/daraz_product_sync_model");
const darazSalesLookupModel = require("../../../models/daraz/product_management/daraz_sales_lookup_model");

const IMPACT_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

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
    const skus = Array.isArray(product?.skus_json) ? product.skus_json : [];
    const matchedSku = skus.find((sku) => sku?.SellerSku === suggestion.seller_sku) || skus[0] || null;

    await darazProductApiService.updateDarazProductDetails({
      account,
      credentials,
      itemId: suggestion.daraz_item_id,
      primaryCategory: product?.primary_category || null,
      sellerSku: suggestion.seller_sku,
      skuId: matchedSku?.SkuId || null,
      name: suggestion.suggested_title,
      brand: product?.brand || null,
      quantity: product?.quantity ?? null,
      price: product?.price ?? null,
    });

    const updated = await titleSuggestionModel.updateStatus(id, {
      status: "applied",
      reviewed_by: req.user?.id || null,
      applied_at: new Date(),
    });

    await titleOptimizerLogModel.logTitleApplied({
      account_id: suggestion.account_id,
      reviewed_by: req.user?.id || null,
      suggestion_id: suggestion.id,
      seller_sku: suggestion.seller_sku,
      old_title: suggestion.original_title,
      new_title: suggestion.suggested_title,
      status: "success",
    });

    return res.json({ success: true, message: "Title applied to Daraz.", data: updated });
  } catch (error) {
    console.error("[DARAZ_TITLE_APPROVE_ERROR]", {
      message: error?.message,
      request_id: error?.request_id,
      trace_id: error?.trace_id,
      raw: error?.raw,
    });

    const detailedMessage = [
      error.message,
      error.request_id ? `request_id: ${error.request_id}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const failedSuggestion = await titleSuggestionModel.updateStatus(req.params.id, {
      status: "failed",
      reviewed_by: req.user?.id || null,
      error_message: detailedMessage,
    });

    await titleOptimizerLogModel.logTitleApplied({
      account_id: failedSuggestion?.account_id,
      reviewed_by: req.user?.id || null,
      suggestion_id: failedSuggestion?.id,
      seller_sku: failedSuggestion?.seller_sku,
      old_title: failedSuggestion?.original_title,
      new_title: failedSuggestion?.suggested_title,
      status: "failed",
      message: detailedMessage,
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

    await titleOptimizerLogModel.logTitleApplied({
      account_id: suggestion.account_id,
      reviewed_by: req.user?.id || null,
      suggestion_id: suggestion.id,
      seller_sku: suggestion.seller_sku,
      old_title: suggestion.original_title,
      new_title: suggestion.suggested_title,
      status: "rejected",
      message: "Suggestion rejected by reviewer.",
    });

    return res.json({ success: true, message: "Suggestion rejected.", data: updated });
  } catch (error) {
    console.error("[DARAZ_TITLE_REJECT_ERROR]", { message: error?.message });

    return res.status(500).json({ success: false, message: "Failed to reject suggestion." });
  }
}

async function getTitleChangeImpact(req, res) {
  try {
    const { id } = req.params;
    const log = await titleOptimizerLogModel.findById(id);

    if (!log || log.event_type !== "title_applied" || log.status !== "success") {
      return res.status(404).json({ success: false, message: "No applied title change found for this log entry." });
    }

    const account = await accountModel.findById(log.account_id);

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    const changedAt = new Date(log.created_at);
    const now = new Date();
    const windowMs = IMPACT_WINDOW_DAYS * DAY_MS;

    const afterEnd = new Date(Math.min(changedAt.getTime() + windowMs, now.getTime()));
    const daysElapsedSinceChange = Math.floor((now.getTime() - changedAt.getTime()) / DAY_MS);

    const [before, after] = await Promise.all([
      darazSalesLookupModel.getSalesWindow({
        accountName: account.account_name,
        sellerSku: log.seller_sku,
        from: new Date(changedAt.getTime() - windowMs),
        to: changedAt,
      }),
      darazSalesLookupModel.getSalesWindow({
        accountName: account.account_name,
        sellerSku: log.seller_sku,
        from: changedAt,
        to: afterEnd,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        seller_sku: log.seller_sku,
        old_title: log.old_title,
        new_title: log.new_title,
        changed_at: log.created_at,
        days_elapsed_since_change: daysElapsedSinceChange,
        window_days: IMPACT_WINDOW_DAYS,
        after_window_complete: daysElapsedSinceChange >= IMPACT_WINDOW_DAYS,
        before,
        after,
      },
    });
  } catch (error) {
    console.error("[DARAZ_TITLE_IMPACT_ERROR]", { message: error?.message });

    return res.status(500).json({ success: false, message: "Failed to compute title change impact." });
  }
}

module.exports = { scan, listSuggestions, approveSuggestion, rejectSuggestion, getTitleChangeImpact };

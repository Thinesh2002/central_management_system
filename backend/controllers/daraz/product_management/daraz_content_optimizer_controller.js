const accountModel = require("../../../models/marketplace/account_model");
const tokenService = require("../../../services/marketplace/token_service");
const contentSuggestionModel = require("../../../models/daraz/product_management/daraz_content_suggestion_model");
const contentOptimizerLogModel = require("../../../models/daraz/product_management/daraz_content_optimizer_log_model");
const contentScanService = require("../../../services/daraz/product_management/daraz_content_scan_service");
const darazProductApiService = require("../../../services/marketplace/daraz_product_api_service");
const darazProductSyncModel = require("../../../models/daraz/product_management/daraz_product_sync_model");
const darazSalesLookupModel = require("../../../models/daraz/product_management/daraz_sales_lookup_model");

const NEEDS_OPTIMIZATION_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Manual "Run Analysis" trigger - master admin only, matching the app's
// existing ad hoc role-check convention (accessController.js/userController.js)
// rather than the unused allowRoles middleware.
async function scan(req, res) {
  try {
    if (req.user?.role !== "master_admin") {
      return res.status(403).json({ success: false, message: "Only a master admin can run this manually." });
    }

    const { accountId, limit, mode, staleDays } = req.body || {};

    if (!accountId) {
      return res.status(400).json({ success: false, message: "accountId is required." });
    }

    const result = await contentScanService.scanAccountForContentOptimization({
      accountId,
      limit: limit || 50,
      userId: req.user?.id || null,
      mode: mode === "stale" ? "stale" : "manual",
      staleDays: staleDays || 30,
    });

    return res.json({ success: true, message: "Analysis completed.", data: result });
  } catch (error) {
    console.error("[DARAZ_CONTENT_SCAN_ERROR]", { message: error?.message });

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to analyze products.",
    });
  }
}

async function listSuggestions(req, res) {
  try {
    const { account_id: accountId, status, scan_batch_id: scanBatchId, limit, needs_optimization: needsOptimization } =
      req.query || {};

    const listParams = {
      account_id: accountId,
      status,
      scan_batch_id: scanBatchId,
      limit,
    };

    // "Needs Optimization" tab: suggestions generated in the last 30 days
    // for SKUs that still have no sales in that same window - the ones the
    // scan job keeps retrying because the AI content alone hasn't fixed
    // whatever's not converting yet. Requires an account since sales are
    // looked up by account_name.
    if (String(needsOptimization).toLowerCase() === "true" && accountId) {
      const account = await accountModel.getAccountById(accountId);

      if (account) {
        const sinceDate = new Date(Date.now() - NEEDS_OPTIMIZATION_WINDOW_DAYS * DAY_MS);
        const recentlySoldSkus = await darazSalesLookupModel.getRecentlySoldSkus({
          accountName: account.account_name,
          sinceDate,
        });

        listParams.since_date = sinceDate;
        listParams.exclude_seller_skus = Array.from(recentlySoldSkus);
      }
    }

    const data = await contentSuggestionModel.list(listParams);

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[DARAZ_CONTENT_LIST_ERROR]", { message: error?.message });

    return res.status(500).json({ success: false, message: "Failed to load content suggestions." });
  }
}

async function getSuggestion(req, res) {
  try {
    const suggestion = await contentSuggestionModel.findDetailById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({ success: false, message: "Suggestion not found." });
    }

    return res.json({ success: true, data: suggestion });
  } catch (error) {
    console.error("[DARAZ_CONTENT_GET_ERROR]", { message: error?.message });

    return res.status(500).json({ success: false, message: "Failed to load content suggestion." });
  }
}

// Only description can be safely pushed to the live listing today -
// highlights/keywords/extracted-features are Daraz category *attributes*
// with keys that vary per category and were never confirmed against a
// live response (see daraz_content_analysis_rules.js), so pushing them
// automatically risks sending a malformed attribute payload to a real
// listing. Those stay copy-paste-yourself in v1.
async function applyDescription(req, res) {
  const { id } = req.params;

  try {
    const suggestion = await contentSuggestionModel.findById(id);

    if (!suggestion) {
      return res.status(404).json({ success: false, message: "Suggestion not found." });
    }

    if (!suggestion.suggested_description_html) {
      return res.status(400).json({ success: false, message: "No AI description available for this product." });
    }

    const account = await accountModel.getAccountById(suggestion.account_id);
    const { credentials } = await tokenService.getValidCredentialsForAccount(suggestion.account_id);

    if (!account) {
      return res.status(400).json({ success: false, message: "Daraz account not found." });
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
      name: product?.name || null,
      shortDescription: suggestion.suggested_description_html,
      brand: product?.brand || null,
      quantity: product?.quantity ?? null,
      price: product?.price ?? null,
    });

    const updated = await contentSuggestionModel.updateStatus(id, {
      status: "partially_applied",
      reviewed_by: req.user?.id || null,
      applied_at: new Date(),
    });

    await contentOptimizerLogModel.logSectionApplied({
      account_id: suggestion.account_id,
      reviewed_by: req.user?.id || null,
      suggestion_id: suggestion.id,
      seller_sku: suggestion.seller_sku,
      section: "description",
      status: "success",
    });

    return res.json({ success: true, message: "Description applied to Daraz.", data: updated });
  } catch (error) {
    console.error("[DARAZ_CONTENT_APPLY_ERROR]", { message: error?.message });

    await contentOptimizerLogModel.logSectionApplied({
      account_id: req.body?.accountId || null,
      reviewed_by: req.user?.id || null,
      suggestion_id: id,
      section: "description",
      status: "failed",
      message: error.message,
    });

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to apply description to Daraz.",
    });
  }
}

async function reject(req, res) {
  try {
    const { id } = req.params;
    const suggestion = await contentSuggestionModel.findById(id);

    if (!suggestion) {
      return res.status(404).json({ success: false, message: "Suggestion not found." });
    }

    const updated = await contentSuggestionModel.updateStatus(id, {
      status: "rejected",
      reviewed_by: req.user?.id || null,
    });

    return res.json({ success: true, message: "Suggestion rejected.", data: updated });
  } catch (error) {
    console.error("[DARAZ_CONTENT_REJECT_ERROR]", { message: error?.message });

    return res.status(500).json({ success: false, message: "Failed to reject suggestion." });
  }
}

module.exports = { scan, listSuggestions, getSuggestion, applyDescription, reject };

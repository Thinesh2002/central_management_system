const crypto = require("crypto");

const accountModel = require("../../../models/marketplace/account_model");
const tokenService = require("../../marketplace/token_service");
const darazProductSyncModel = require("../../../models/daraz/product_management/daraz_product_sync_model");
const titleSuggestionModel = require("../../../models/daraz/product_management/daraz_title_suggestion_model");
const titleSiblingModel = require("../../../models/daraz/product_management/daraz_title_sibling_model");
const titleOptimizerService = require("./daraz_title_optimizer_service");
const contentOptimizerService = require("./daraz_content_optimizer_service");
const analysisRules = require("./daraz_content_analysis_rules");
const contentSuggestionModel = require("../../../models/daraz/product_management/daraz_content_suggestion_model");
const contentOptimizerLogModel = require("../../../models/daraz/product_management/daraz_content_optimizer_log_model");
const darazCatalogApiService = require("../../marketplace/daraz_catalog_api_service");

const SCAN_CONCURRENCY = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));
  return results;
}

function isEligibleForContentAnalysis(product) {
  return String(product.status || "").toLowerCase() === "active";
}

// Best-effort: daraz_products.primary_category stores a display-name
// string, not the numeric category ID Daraz's category-attributes API
// needs, and there's no stored mapping between the two on this table.
// Without a real ID this step is skipped rather than guessed - attribute
// validation degrades gracefully to "no requirements checked" instead of
// blocking the rest of the product's analysis.
async function tryValidateAttributes({ account, credentials, product }) {
  if (!product.primary_category || !/^\d+$/.test(String(product.primary_category))) {
    return { missing: [], incorrect: [], duplicate: [], totalDefinitions: 0 };
  }

  try {
    const response = await darazCatalogApiService.getDarazCategoryAttributes({
      account,
      credentials,
      primaryCategoryId: product.primary_category,
    });

    return analysisRules.validateAttributes(product, response);
  } catch (error) {
    console.error("[DARAZ_CONTENT_SCAN] Attribute validation skipped:", error.message);
    return { missing: [], incorrect: [], duplicate: [], totalDefinitions: 0 };
  }
}

async function tryGenerateTitleSuggestion({ account, product, scanBatchId, userId }) {
  try {
    const siblings = await titleSiblingModel.findSiblingListings({
      sellerSku: product.seller_sku,
      excludeAccountId: account.id,
    });
    const avoidTitles = siblings.map((sibling) => sibling.current_title).filter(Boolean);

    const suggestion = await titleOptimizerService.generateTitleSuggestion(product, { avoidTitles });

    const titleRow = await titleSuggestionModel.create({
      account_id: account.id,
      daraz_product_id: product.id,
      daraz_item_id: product.daraz_item_id,
      seller_sku: product.seller_sku,
      original_title: product.name,
      suggested_title: suggestion.title,
      reasoning: suggestion.reasoning,
      scan_batch_id: scanBatchId,
      created_by: userId,
    });

    return titleRow.id;
  } catch (error) {
    console.error("[DARAZ_CONTENT_SCAN] Title generation skipped:", error.message);
    return null;
  }
}

async function analyzeOneProduct({ account, credentials, product, userId, scanBatchId }) {
  const titleSuggestionId = await tryGenerateTitleSuggestion({ account, product, scanBatchId, userId });
  const generated = await contentOptimizerService.generateContentSuggestion(product);
  const attributeValidation = await tryValidateAttributes({ account, credentials, product });

  const completeness = analysisRules.scoreCompleteness(product, generated);
  const compliance = analysisRules.scoreCompliance(product, attributeValidation);
  const scores = { ...generated.aiScores, completeness, compliance };
  scores.overall = analysisRules.computeOverallScore(scores);

  const recommendations = analysisRules.buildRecommendations({ product, generated, attributeValidation, scores });
  const checklist = analysisRules.buildPublishingChecklist(product, generated, attributeValidation);

  await contentSuggestionModel.create({
    account_id: account.id,
    daraz_product_id: product.id,
    daraz_item_id: product.daraz_item_id,
    seller_sku: product.seller_sku,
    title_suggestion_id: titleSuggestionId,
    original_highlights: generated.originalHighlights,
    suggested_highlights: generated.suggestedHighlights,
    highlights_reasoning: generated.highlightsReasoning,
    original_description: generated.originalDescription,
    suggested_description: generated.suggestedDescription,
    suggested_description_html: generated.suggestedDescriptionHtml,
    description_sections: generated.descriptionSections,
    extracted_features: generated.extractedFeatures,
    keyword_suggestions: generated.keywords,
    attribute_validation: attributeValidation,
    scores,
    recommendations,
    publishing_checklist: checklist.items,
    readiness_percent: checklist.readinessPercent,
    scan_batch_id: scanBatchId,
    created_by: userId,
  });
}

async function scanAccountForContentOptimization({
  accountId,
  limit = 50,
  userId = null,
  mode = "manual",
  staleDays = 30,
}) {
  const scanBatchId = `content_scan_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

  const account = await accountModel.getAccountById(accountId);
  if (!account) {
    const error = new Error("Daraz account not found.");
    error.statusCode = 404;
    throw error;
  }

  const { credentials } = await tokenService.getValidCredentialsForAccount(accountId);

  const rawCandidates = await darazProductSyncModel.listPreview({ account_id: accountId, limit, offset: 0 });
  const candidateProducts = rawCandidates.filter(isEligibleForContentAnalysis);

  const [pendingProductIds, recentSuggestionProductIds] = await Promise.all([
    contentSuggestionModel.findPendingProductIds(accountId),
    contentSuggestionModel.findRecentSuggestionProductIds({
      account_id: accountId,
      since_date: new Date(Date.now() - staleDays * DAY_MS),
    }),
  ]);

  const products = candidateProducts.filter(
    (product) => !pendingProductIds.has(product.id) && !recentSuggestionProductIds.has(product.id)
  );

  let succeeded = 0;
  let failed = 0;

  await mapWithConcurrency(products, SCAN_CONCURRENCY, async (product) => {
    try {
      await analyzeOneProduct({ account, credentials, product, userId, scanBatchId });
      succeeded += 1;
    } catch (error) {
      await contentSuggestionModel.createError({
        account_id: accountId,
        daraz_product_id: product.id,
        daraz_item_id: product.daraz_item_id,
        seller_sku: product.seller_sku,
        error_message: error.message,
        scan_batch_id: scanBatchId,
        created_by: userId,
      });

      failed += 1;
    }
  });

  await contentOptimizerLogModel.logScanBatch({
    account_id: accountId,
    scan_batch_id: scanBatchId,
    total: products.length,
    succeeded,
    failed,
    status: failed > 0 && succeeded === 0 && products.length > 0 ? "failed" : "success",
    message: `${mode} content scan: ${succeeded} of ${products.length} product(s) analyzed.`,
  });

  return {
    scan_batch_id: scanBatchId,
    total: products.length,
    succeeded,
    failed,
  };
}

module.exports = { scanAccountForContentOptimization };

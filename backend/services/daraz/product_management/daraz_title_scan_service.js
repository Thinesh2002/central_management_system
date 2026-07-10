const crypto = require("crypto");

const accountModel = require("../../../models/marketplace/account_model");
const darazProductSyncModel = require("../../../models/daraz/product_management/daraz_product_sync_model");
const titleSuggestionModel = require("../../../models/daraz/product_management/daraz_title_suggestion_model");
const titleSiblingModel = require("../../../models/daraz/product_management/daraz_title_sibling_model");
const darazSalesLookupModel = require("../../../models/daraz/product_management/daraz_sales_lookup_model");
const titleOptimizerService = require("./daraz_title_optimizer_service");
const titleOptimizerLogModel = require("../../../models/daraz/product_management/daraz_title_optimizer_log_model");

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

async function findStaleProducts({ accountId, limit, staleDays }) {
  const account = await accountModel.getAccountById(accountId);
  if (!account) return [];

  const sinceDate = new Date(Date.now() - staleDays * DAY_MS);

  const [recentlySoldSkus, allProducts] = await Promise.all([
    darazSalesLookupModel.getRecentlySoldSkus({ accountName: account.account_name, sinceDate }),
    darazProductSyncModel.listPreview({ account_id: accountId, limit, offset: 0 }),
  ]);

  return allProducts.filter((product) => product.seller_sku && !recentlySoldSkus.has(product.seller_sku));
}

async function scanAccountForTitleSuggestions({
  accountId,
  limit = 50,
  userId = null,
  mode = "manual",
  staleDays = 30,
}) {
  const isStaleMode = mode === "stale";
  const scanBatchId = `${isStaleMode ? "stale_scan" : "title_scan"}_${Date.now()}_${crypto
    .randomBytes(3)
    .toString("hex")}`;

  const candidateProducts = isStaleMode
    ? await findStaleProducts({ accountId, limit, staleDays })
    : await darazProductSyncModel.listPreview({ account_id: accountId, limit, offset: 0 });

  const [pendingProductIds, recentSuggestionProductIds] = await Promise.all([
    titleSuggestionModel.findPendingProductIds(accountId),
    titleSuggestionModel.findRecentSuggestionProductIds({
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
      const siblings = await titleSiblingModel.findSiblingListings({
        sellerSku: product.seller_sku,
        excludeAccountId: accountId,
      });
      const avoidTitles = siblings.map((sibling) => sibling.current_title).filter(Boolean);

      const suggestion = await titleOptimizerService.generateTitleSuggestion(product, { avoidTitles });

      await titleSuggestionModel.create({
        account_id: accountId,
        daraz_product_id: product.id,
        daraz_item_id: product.daraz_item_id,
        seller_sku: product.seller_sku,
        original_title: product.name,
        suggested_title: suggestion.title,
        reasoning: suggestion.reasoning,
        scan_batch_id: scanBatchId,
        created_by: userId,
      });

      succeeded += 1;
    } catch (error) {
      await titleSuggestionModel.createError({
        account_id: accountId,
        daraz_product_id: product.id,
        daraz_item_id: product.daraz_item_id,
        seller_sku: product.seller_sku,
        original_title: product.name,
        error_message: error.message,
        scan_batch_id: scanBatchId,
        created_by: userId,
      });

      failed += 1;
    }
  });

  await titleOptimizerLogModel.logScanBatch({
    account_id: accountId,
    scan_batch_id: scanBatchId,
    total: products.length,
    succeeded,
    failed,
    status: failed > 0 && succeeded === 0 && products.length > 0 ? "failed" : "success",
    message: `${mode} scan: ${succeeded} of ${products.length} suggestions generated.`,
  });

  return {
    scan_batch_id: scanBatchId,
    total: products.length,
    succeeded,
    failed,
  };
}

module.exports = { scanAccountForTitleSuggestions };

const crypto = require("crypto");

const darazProductSyncModel = require("../../../models/daraz/product_management/daraz_product_sync_model");
const titleSuggestionModel = require("../../../models/daraz/product_management/daraz_title_suggestion_model");
const titleOptimizerService = require("./daraz_title_optimizer_service");

const SCAN_CONCURRENCY = 3;

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

async function scanAccountForTitleSuggestions({ accountId, limit = 50, userId = null }) {
  const scanBatchId = `title_scan_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

  const products = await darazProductSyncModel.listPreview({
    account_id: accountId,
    limit,
    offset: 0,
  });

  let succeeded = 0;
  let failed = 0;

  await mapWithConcurrency(products, SCAN_CONCURRENCY, async (product) => {
    try {
      const suggestion = await titleOptimizerService.generateTitleSuggestion(product);

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

  return {
    scan_batch_id: scanBatchId,
    total: products.length,
    succeeded,
    failed,
  };
}

module.exports = { scanAccountForTitleSuggestions };

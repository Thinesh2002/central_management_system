const orderDb = require("../../../config/order_management_db/order_management_db");
const inventoryDb = require("../../../config/inventory_management_db/inventory_management_db");
const productDb = require("../../../config/product_management_db/product_management_db");

const LOOKBACK_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_CONFIDENCE = 0.6;
const MAX_ORDER_SKUS = 1000;
const MAX_SUGGESTIONS = 50;

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;

    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }

  return dp[n];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function bestMatch(wrongSku, localSkus) {
  let best = null;

  for (const localSku of localSkus) {
    const score = similarity(wrongSku, localSku);

    if (!best || score > best.score) {
      best = { correct_sku: localSku, score };
    }
  }

  return best;
}

async function findSuggestedMappings({ limit = MAX_SUGGESTIONS } = {}) {
  const sinceDate = new Date(Date.now() - LOOKBACK_DAYS * DAY_MS);

  const [[orderSkuRows], [localSkuRows], [mappingRows]] = await Promise.all([
    orderDb.query(
      `SELECT i.seller_sku, COUNT(*) AS occurrences
       FROM daraz_order_items i
       INNER JOIN daraz_orders o ON o.id = i.daraz_order_id
       WHERE o.order_date >= ? AND i.seller_sku IS NOT NULL AND i.seller_sku != ''
       GROUP BY i.seller_sku
       ORDER BY occurrences DESC
       LIMIT ?`,
      [sinceDate, MAX_ORDER_SKUS]
    ),
    inventoryDb.query(`SELECT sku FROM product_inventory WHERE deleted_at IS NULL`),
    productDb.query(`SELECT wrong_sku FROM sku_mappings`),
  ]);

  const localSkus = localSkuRows.map((row) => row.sku).filter(Boolean);
  const localSkuSet = new Set(localSkus);
  const alreadyMappedSet = new Set(mappingRows.map((row) => row.wrong_sku));

  const unresolved = orderSkuRows.filter(
    (row) => !localSkuSet.has(row.seller_sku) && !alreadyMappedSet.has(row.seller_sku)
  );

  const suggestions = unresolved
    .map((row) => {
      const match = bestMatch(row.seller_sku, localSkus);
      if (!match || match.score < MIN_CONFIDENCE) return null;

      return {
        wrong_sku: row.seller_sku,
        suggested_correct_sku: match.correct_sku,
        confidence: Math.round(match.score * 100) / 100,
        occurrences: row.occurrences,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence || b.occurrences - a.occurrences)
    .slice(0, limit);

  return {
    suggestions,
    scanned_order_skus: orderSkuRows.length,
    unresolved_count: unresolved.length,
  };
}

module.exports = { findSuggestedMappings };

const orderDb = require("../../../config/order_management_db/order_management_db");
const inventoryDb = require("../../../config/inventory_management_db/inventory_management_db");
const productDb = require("../../../config/product_management_db/product_management_db");

const LOOKBACK_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_CONFIDENCE = 0.3;
const MAX_ORDER_SKUS = 1000;
const MAX_SUGGESTIONS = 50;
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "for",
  "your",
  "new",
  "set",
  "pack",
  "pcs",
  "piece",
  "pieces",
]);

function tokenize(text) {
  const words = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  return new Set(words);
}

function jaccardSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function bestTitleMatch(titleTokens, candidates) {
  let best = null;

  for (const candidate of candidates) {
    const score = jaccardSimilarity(titleTokens, candidate.tokens);

    if (!best || score > best.score) {
      best = { sku: candidate.sku, name: candidate.name, image: candidate.image, score };
    }
  }

  return best;
}

async function findSuggestedMappings({ limit = MAX_SUGGESTIONS } = {}) {
  const sinceDate = new Date(Date.now() - LOOKBACK_DAYS * DAY_MS);

  const [[orderItemRows], [localSkuRows], [mappingRows], [variantRows]] = await Promise.all([
    orderDb.query(
      `SELECT i.seller_sku, MAX(i.product_title) AS product_title, MAX(i.product_image_url) AS product_image_url,
              COUNT(*) AS occurrences
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
    // Only variant (child) SKUs are real sellable/trackable units in this
    // catalog - parent product rows are never the "correct" SKU to map to.
    productDb.query(
      `SELECT v.variant_sku, v.image_url, COALESCE(v.variant_name, p.product_name) AS variant_name
       FROM product_variants v
       INNER JOIN products p ON p.id = v.product_id
       WHERE v.deleted_at IS NULL AND v.variant_sku IS NOT NULL`
    ),
  ]);

  const localSkuSet = new Set(localSkuRows.map((row) => row.sku).filter(Boolean));
  const alreadyMappedSet = new Set(mappingRows.map((row) => row.wrong_sku));

  const candidates = variantRows
    .map((row) => ({
      sku: row.variant_sku,
      name: row.variant_name,
      image: row.image_url,
      tokens: tokenize(row.variant_name),
    }))
    .filter((candidate) => candidate.sku && candidate.tokens.size > 0);

  const unresolved = orderItemRows.filter(
    (row) => !localSkuSet.has(row.seller_sku) && !alreadyMappedSet.has(row.seller_sku)
  );

  const suggestions = unresolved
    .map((row) => {
      const titleTokens = tokenize(row.product_title);
      if (!titleTokens.size) return null;

      const match = bestTitleMatch(titleTokens, candidates);
      if (!match || match.score < MIN_CONFIDENCE) return null;

      return {
        wrong_sku: row.seller_sku,
        wrong_sku_image: row.product_image_url,
        suggested_correct_sku: match.sku,
        correct_sku_image: match.image,
        matched_product_name: match.name,
        order_product_title: row.product_title,
        confidence: Math.round(match.score * 100) / 100,
        occurrences: row.occurrences,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence || b.occurrences - a.occurrences)
    .slice(0, limit);

  return {
    suggestions,
    scanned_order_skus: orderItemRows.length,
    unresolved_count: unresolved.length,
  };
}

module.exports = { findSuggestedMappings };

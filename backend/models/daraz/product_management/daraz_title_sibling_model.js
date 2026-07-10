const db = require("../../../config/product_management_db/product_management_db");

function inClause(values) {
  return values.map(() => "?").join(",");
}

async function resolveCanonicalSku(sellerSku) {
  if (!sellerSku) return sellerSku;

  const [rows] = await db.query(`SELECT correct_sku FROM sku_mappings WHERE wrong_sku = ? LIMIT 1`, [sellerSku]);

  return rows[0]?.correct_sku || sellerSku;
}

async function findSiblingSkus(canonicalSku) {
  const [rows] = await db.query(`SELECT wrong_sku FROM sku_mappings WHERE correct_sku = ?`, [canonicalSku]);

  const skus = new Set(rows.map((row) => row.wrong_sku));
  skus.add(canonicalSku);

  return Array.from(skus);
}

async function findSiblingListings({ sellerSku, excludeAccountId }) {
  if (!sellerSku) return [];

  const canonicalSku = await resolveCanonicalSku(sellerSku);
  const candidateSkus = await findSiblingSkus(canonicalSku);

  if (!candidateSkus.length) return [];

  const placeholders = inClause(candidateSkus);

  const [rows] = await db.query(
    `SELECT account_id, seller_sku, name AS current_title
     FROM daraz_products
     WHERE seller_sku IN (${placeholders}) AND account_id != ?`,
    [...candidateSkus, excludeAccountId]
  );

  return rows;
}

module.exports = { resolveCanonicalSku, findSiblingListings };

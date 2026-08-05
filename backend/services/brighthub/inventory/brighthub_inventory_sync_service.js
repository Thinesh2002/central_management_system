const accountModel = require("../../../models/marketplace/account_model");
const brighthubModel = require("../../../models/marketplace/brighthub/brighthub_model");
const brighthubProductModel = require("../../../models/brighthub/product/brighthub_product_model");
const brighthubApi = require("../../marketplace/brighthub/brighthub_api_service");

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(Math.trunc(parsed), 0) : fallback;
}

// Read-only - for the Inventory page's "Website Stock" column, showing what
// quantity BrightHub currently has on file per linked account for each SKU
// (no push, no writes). Matches every row on the Inventory page regardless
// of whether that SKU is a parent product or a variant/child SKU, the same
// way the Daraz Stock column already does - it's just a per-SKU lookup.
async function getBrightHubStockForSkus(skus = []) {
  const rows = await brighthubProductModel.getStockForSkus(skus);
  if (!rows.length) return {};

  const accounts = await accountModel.getAllAccounts({ platform_code: "BRIGHTHUB" });
  const accountNameById = new Map(accounts.map((account) => [account.id, account.account_name || account.account_code]));

  const skuByLower = new Map(skus.map((s) => [String(s).trim().toLowerCase(), String(s).trim()]));

  const result = {};

  rows.forEach((row) => {
    const correctSku = skuByLower.get(String(row.sku || "").toLowerCase());
    if (!correctSku) return;

    if (!result[correctSku]) result[correctSku] = [];

    result[correctSku].push({
      account_id: row.account_id,
      account_name: accountNameById.get(row.account_id) || `Account ${row.account_id}`,
      bhid: row.bhid,
      sku: row.sku,
      quantity: Number(row.stock_quantity || 0),
    });
  });

  return result;
}

// Pushes local stock to every BrightHub listing sharing this SKU across
// every connected account. BrightHub's PUT is a full replace, so each
// listing's current live product is fetched first and only stock_quantity
// is overridden - same safeguard as the Edit Website Product page.
async function pushSkuStockToBrightHub({ sku, quantity, source = "inventory_update", userId = null } = {}) {
  const cleanSku = String(sku || "").trim();
  const stockQty = toInt(quantity, 0);

  if (!cleanSku) {
    return { success: false, sku: cleanSku, quantity: stockQty, total: 0, success_count: 0, failed_count: 0, skipped_count: 1, message: "SKU missing. Website stock sync skipped." };
  }

  const matches = await brighthubProductModel.getStockForSkus([cleanSku]);

  if (!matches.length) {
    return { success: true, sku: cleanSku, quantity: stockQty, total: 0, success_count: 0, failed_count: 0, skipped_count: 1, message: "SKU not found on BrightHub. Nothing pushed." };
  }

  let successCount = 0;
  let failedCount = 0;
  const details = [];

  for (const match of matches) {
    try {
      const credentials = await brighthubModel.getBrightHubCredentials(match.account_id);
      const liveProduct = await brighthubApi.getProduct(credentials, match.bhid);

      if (!liveProduct) throw new Error("Product not found on BrightHub.");

      const payload = { ...liveProduct, stock_quantity: stockQty };
      delete payload.id;
      delete payload.bhid;

      await brighthubApi.updateProduct(credentials, match.bhid, payload);
      await brighthubProductModel.updateStockQuantity(match.account_id, match.bhid, stockQty);

      await brighthubModel.logApiRequest({
        account_id: match.account_id,
        endpoint: `/products/${match.bhid}`,
        http_method: "PUT",
        request_type: "inventory",
        response_status_code: 200,
        api_status: "success",
        request_summary: { sku: cleanSku, stock_quantity: stockQty, source },
      });

      successCount += 1;
      details.push({ account_id: match.account_id, bhid: match.bhid, sku: match.sku, status: "success" });
    } catch (error) {
      failedCount += 1;

      await brighthubModel.logApiRequest({
        account_id: match.account_id,
        endpoint: `/products/${match.bhid}`,
        http_method: "PUT",
        request_type: "inventory",
        response_status_code: error?.response?.status || 500,
        api_status: "failed",
        error_message: error?.response?.data?.message || error.message,
        request_summary: { sku: cleanSku, stock_quantity: stockQty, source },
      });

      details.push({
        account_id: match.account_id,
        bhid: match.bhid,
        sku: match.sku,
        status: "failed",
        message: error?.response?.data?.message || error.message,
      });
    }
  }

  return {
    success: failedCount === 0,
    sku: cleanSku,
    quantity: stockQty,
    total: matches.length,
    success_count: successCount,
    failed_count: failedCount,
    skipped_count: 0,
    details,
  };
}

module.exports = {
  getBrightHubStockForSkus,
  pushSkuStockToBrightHub,
};

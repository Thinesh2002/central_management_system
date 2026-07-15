const crypto = require("crypto");

const wooModel = require("../../../models/marketplace/woo/woo_model");
const wooProductModel = require("../../../models/woo/product/woo_product_model");
const wooApi = require("../../marketplace/woo/woo_api_service");
const logsDb = require("../../../config/logs_management_db/logs_management_db");

function makeJobUid(prefix = "woo_inventory") {
  return `${prefix}_${Date.now()}_${crypto.randomUUID()}`;
}

function normalizeQuantity(value) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.max(Math.trunc(num), 0) : 0;
}

async function createSyncLog(payload = {}) {
  await logsDb.query(
    `INSERT INTO woo_inventory_sync_logs (
      job_uid, account_id, account_code, sku, woo_product_id, woo_variation_id,
      old_quantity, new_quantity, source, sync_status, message, error_code,
      error_message, changed_by, started_at, finished_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.job_uid || null,
      payload.account_id || null,
      payload.account_code || null,
      payload.sku,
      payload.woo_product_id || null,
      payload.woo_variation_id || null,
      payload.old_quantity ?? null,
      normalizeQuantity(payload.new_quantity),
      payload.source || "inventory_update",
      payload.sync_status || "pending",
      payload.message || null,
      payload.error_code || null,
      payload.error_message || null,
      payload.changed_by || null,
      payload.started_at || null,
      payload.finished_at || null,
    ]
  );
}

// Mirrors daraz_inventory_sync_service.pushSkuStockToDaraz - same shape,
// same "skip silently if the SKU isn't linked to any WooCommerce listing"
// behavior, just pushed via WooCommerce's REST API instead of Daraz's.
async function pushSkuStockToWoo({ sku, quantity, source = "inventory_update", userId = null } = {}) {
  const cleanSku = String(sku || "").trim();
  const stockQty = normalizeQuantity(quantity);
  const jobUid = makeJobUid(source);

  if (!cleanSku) {
    return { success: false, sku: cleanSku, total: 0, success_count: 0, failed_count: 0, skipped_count: 1 };
  }

  const matches = await wooProductModel.findWooListingsBySku(cleanSku);

  if (!matches.length) {
    return { success: true, sku: cleanSku, total: 0, success_count: 0, failed_count: 0, skipped_count: 1 };
  }

  let successCount = 0;
  let failedCount = 0;
  const credentialsCache = new Map();

  for (const match of matches) {
    const startedAt = new Date();

    try {
      if (!credentialsCache.has(match.account_id)) {
        credentialsCache.set(match.account_id, await wooModel.getWooCredentials(match.account_id));
      }
      const credentials = credentialsCache.get(match.account_id);

      if (match.woo_variation_id) {
        await wooApi.updateProductVariation(credentials, match.woo_product_id, match.woo_variation_id, {
          stock_quantity: stockQty,
          manage_stock: true,
        });
      } else {
        await wooApi.updateProduct(credentials, match.woo_product_id, {
          stock_quantity: stockQty,
          manage_stock: true,
        });
      }

      await createSyncLog({
        job_uid: jobUid,
        account_id: match.account_id,
        account_code: credentials.account_code,
        sku: cleanSku,
        woo_product_id: match.woo_product_id,
        woo_variation_id: match.woo_variation_id,
        old_quantity: match.current_stock_quantity,
        new_quantity: stockQty,
        source,
        sync_status: "success",
        message: "Stock pushed to WooCommerce successfully.",
        changed_by: userId,
        started_at: startedAt,
        finished_at: new Date(),
      });

      successCount += 1;
    } catch (error) {
      failedCount += 1;

      await createSyncLog({
        job_uid: jobUid,
        account_id: match.account_id,
        sku: cleanSku,
        woo_product_id: match.woo_product_id,
        woo_variation_id: match.woo_variation_id,
        old_quantity: match.current_stock_quantity,
        new_quantity: stockQty,
        source,
        sync_status: "failed",
        error_code: error.woo?.status_code || null,
        error_message: error.woo?.message || error.message,
        changed_by: userId,
        started_at: startedAt,
        finished_at: new Date(),
      });
    }
  }

  return {
    success: failedCount === 0,
    sku: cleanSku,
    total: matches.length,
    success_count: successCount,
    failed_count: failedCount,
    skipped_count: 0,
  };
}

module.exports = { pushSkuStockToWoo };

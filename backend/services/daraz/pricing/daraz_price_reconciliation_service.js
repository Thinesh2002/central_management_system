const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");
const syncLogModel = require("../../../models/marketplace/sync_log_model");
const darazProductApiService = require("../../marketplace/daraz_product_api_service");
const inventorySyncModel = require("../../../models/daraz/inventory/daraz_inventory_sync_model");
const model = require("../../../models/daraz/pricing/daraz_price_reconciliation_model");

const RECONCILE_CONCURRENCY = 5;

function pricesMatch(a, b) {
  return Math.round(Number(a || 0) * 100) === Math.round(Number(b || 0) * 100);
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));
  return results;
}

async function getCachedAccountAndCredentials(accountCache, accountId) {
  if (accountCache.has(accountId)) return accountCache.get(accountId);

  const [account, credentials] = await Promise.all([
    accountModel.getAccountById(accountId),
    credentialModel.findByAccountId(accountId),
  ]);

  const entry = { account, credentials };
  accountCache.set(accountId, entry);
  return entry;
}

function getDarazError(error) {
  return error?.daraz || {
    code: error?.code || null,
    message: error?.message || "Daraz price reconciliation failed.",
    request_id: error?.request_id || null,
    trace_id: error?.trace_id || null,
  };
}

// Mirrors daraz_inventory_sync_service.pushSkuStockToDaraz, but only
// pushes when the live-cached price actually differs from our target -
// unlike stock (which gets an unconditional push every 30 minutes),
// price reconciliation is meant to be a drift check, not a blind push.
async function reconcileSkuPriceToDaraz({
  sku,
  targetPrice,
  source = "price_reconciliation",
  userId = null,
  jobUid = null,
  createOwnJob = false,
  accountCache = null,
} = {}) {
  const cache = accountCache || new Map();
  const cleanSku = model.cleanSku(sku);
  const price = Number(targetPrice || 0);

  if (!cleanSku || price <= 0) {
    return { sku: cleanSku, total: 0, checked: 0, corrected: 0, failed: 0, skipped: 1 };
  }

  const effectiveJobUid = jobUid || (createOwnJob ? model.makeJobUid(source) : null);
  const matches = await inventorySyncModel.findDarazListingsBySku(cleanSku);

  if (!matches.length) {
    return { sku: cleanSku, total: 0, checked: 0, corrected: 0, failed: 0, skipped: 1 };
  }

  let corrected = 0;
  let failed = 0;

  for (const match of matches) {
    const startedAt = new Date();

    if (pricesMatch(match.price, price)) {
      continue;
    }

    try {
      const { account, credentials } = await getCachedAccountAndCredentials(cache, match.account_id);

      if (!account || !credentials?.access_token) {
        throw Object.assign(new Error("Daraz account credentials missing or token not connected."), {
          code: "DARAZ_TOKEN_MISSING",
          statusCode: 401,
        });
      }

      await darazProductApiService.updateDarazPriceQuantity({
        account,
        credentials,
        itemId: match.daraz_item_id,
        skuId: match.daraz_sku_id,
        sellerSku: cleanSku,
        price,
      });

      await model.createReconciliationLog({
        job_uid: effectiveJobUid,
        account_id: match.account_id,
        account_code: account.account_code,
        seller_sku: cleanSku,
        daraz_item_id: match.daraz_item_id,
        daraz_sku_id: match.daraz_sku_id,
        old_price: match.price,
        new_price: price,
        source,
        sync_status: "success",
        message: "Price corrected on Daraz to match internal target price.",
        changed_by: userId,
        started_at: startedAt,
        finished_at: new Date(),
      });

      corrected += 1;
    } catch (error) {
      const darazError = getDarazError(error);
      failed += 1;

      await model.createReconciliationLog({
        job_uid: effectiveJobUid,
        account_id: match.account_id,
        seller_sku: cleanSku,
        daraz_item_id: match.daraz_item_id,
        daraz_sku_id: match.daraz_sku_id,
        old_price: match.price,
        new_price: price,
        source,
        sync_status: "failed",
        error_code: darazError.code || error.code || null,
        error_message: darazError.message || error.message,
        request_id: darazError.request_id || null,
        trace_id: darazError.trace_id || null,
        changed_by: userId,
        started_at: startedAt,
        finished_at: new Date(),
      });
    }
  }

  return { sku: cleanSku, total: matches.length, checked: matches.length, corrected, failed, skipped: 0 };
}

async function reconcileAllLocalPricesToDaraz({ source = "scheduled_nightly", userId = null } = {}) {
  const jobUid = model.makeJobUid(source);

  const jobId = await syncLogModel
    .createSyncJob({
      job_uid: jobUid,
      account_id: null,
      platform_code: "DARAZ",
      sync_type: "price_reconciliation",
      direction: "push",
      status: "running",
      triggered_by_type: source === "scheduled_nightly" ? "system" : "user",
      triggered_by_user_id: userId,
      message: "Nightly Daraz price reconciliation.",
    })
    .catch((error) => {
      console.error("[DARAZ_PRICE_RECONCILIATION_JOB_CREATE_FAIL]", error.message);
      return null;
    });

  const rows = await model.getLocalPriceRows({ limit: 10000, offset: 0 });
  const accountCache = new Map();

  const results = await mapWithConcurrency(rows, RECONCILE_CONCURRENCY, (row) =>
    reconcileSkuPriceToDaraz({
      sku: row.sku,
      targetPrice: row.daraz_price,
      source,
      userId,
      jobUid,
      accountCache,
    })
  );

  let checked = 0;
  let corrected = 0;
  let failed = 0;

  for (const result of results) {
    checked += result.checked || 0;
    corrected += result.corrected || 0;
    failed += result.failed || 0;
  }

  if (jobId) {
    await syncLogModel
      .finishSyncJob(jobId, {
        status: failed > 0 && corrected > 0 ? "partial" : failed > 0 ? "failed" : "success",
        total_records: rows.length,
        success_records: corrected,
        failed_records: failed,
        skipped_records: rows.length - checked > 0 ? rows.length - checked : 0,
        message: `Price reconciliation completed. ${rows.length} local SKUs checked, ${corrected} corrected, ${failed} failed.`,
      })
      .catch((error) => console.error("[DARAZ_PRICE_RECONCILIATION_JOB_FINISH_FAIL]", error.message));
  }

  return {
    success: failed === 0,
    total_local_skus: rows.length,
    listings_checked: checked,
    corrected,
    failed,
    job_uid: jobUid,
  };
}

module.exports = { reconcileSkuPriceToDaraz, reconcileAllLocalPricesToDaraz };

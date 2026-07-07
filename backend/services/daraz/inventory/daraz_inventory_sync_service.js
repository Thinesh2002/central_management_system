const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");
const syncLogModel = require("../../../models/marketplace/sync_log_model");
const darazProductApiService = require("../../marketplace/daraz_product_api_service");
const model = require("../../../models/daraz/inventory/daraz_inventory_sync_model");

const SYNC_CONCURRENCY = 5;

function normalizeQuantity(value) {
  return model.toInt(value, 0);
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

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, runNext)
  );

  return results;
}

async function getCachedAccountAndCredentials(accountCache, accountId) {
  if (accountCache.has(accountId)) {
    return accountCache.get(accountId);
  }

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
    message: error?.message || "Daraz inventory sync failed.",
    request_id: error?.request_id || null,
    trace_id: error?.trace_id || null,
  };
}

async function createJob({ accountId = null, source = "inventory_update", userId = null, message = null } = {}) {
  try {
    const jobUid = model.makeJobUid(source || "daraz_inventory");
    const jobId = await syncLogModel.createSyncJob({
      job_uid: jobUid,
      account_id: accountId,
      platform_code: "DARAZ",
      sync_type: "inventory_stock_push",
      direction: "push",
      status: "running",
      triggered_by_type: source === "scheduled_30_min" ? "system" : "user",
      triggered_by_user_id: userId,
      message,
    });

    return { jobUid, jobId };
  } catch (error) {
    console.error("[DARAZ_INVENTORY_JOB_CREATE_FAIL]", error.message);
    return { jobUid: model.makeJobUid(source || "daraz_inventory"), jobId: null };
  }
}

async function finishJob(jobId, data = {}) {
  if (!jobId) return;

  try {
    await syncLogModel.finishSyncJob(jobId, data);
  } catch (error) {
    console.error("[DARAZ_INVENTORY_JOB_FINISH_FAIL]", error.message);
  }
}

async function logJobItem(jobId, payload = {}) {
  if (!jobId) return;

  try {
    await syncLogModel.createSyncJobItem({
      job_id: jobId,
      account_id: payload.account_id || null,
      item_type: "daraz_inventory_stock",
      sku: payload.sku || null,
      local_reference: payload.sku || null,
      marketplace_reference: payload.daraz_item_id || null,
      status: payload.status || "success",
      message: payload.message || null,
      error_code: payload.error_code || null,
      error_details: payload.error_details || null,
    });
  } catch (error) {
    console.error("[DARAZ_INVENTORY_JOB_ITEM_FAIL]", error.message);
  }
}

async function pushSkuStockToDaraz({
  sku,
  quantity,
  source = "inventory_update",
  userId = null,
  jobUid = null,
  jobId = null,
  createOwnJob = true,
  accountCache = null,
} = {}) {
  const cache = accountCache || new Map();
  const cleanSku = model.cleanSku(sku);
  const stockQty = normalizeQuantity(quantity);

  if (!cleanSku) {
    return {
      success: false,
      sku: cleanSku,
      quantity: stockQty,
      total: 0,
      success_count: 0,
      failed_count: 0,
      skipped_count: 1,
      message: "SKU missing. Daraz inventory sync skipped.",
    };
  }

  let ownedJob = null;
  if (createOwnJob) {
    ownedJob = await createJob({
      source,
      userId,
      message: `Push stock for SKU ${cleanSku} to Daraz`,
    });
    jobUid = ownedJob.jobUid;
    jobId = ownedJob.jobId;
  }

  const matches = await model.findDarazListingsBySku(cleanSku);

  if (!matches.length) {
    await model.createInventorySyncLog({
      job_uid: jobUid,
      seller_sku: cleanSku,
      new_quantity: stockQty,
      source,
      sync_status: "skipped",
      message: "SKU not linked/found in Daraz product mirror. Sync skipped.",
      changed_by: userId,
      started_at: new Date(),
      finished_at: new Date(),
    });

    await logJobItem(jobId, {
      sku: cleanSku,
      status: "skipped",
      message: "SKU not found in Daraz mirror.",
    });

    if (createOwnJob) {
      await finishJob(jobId, {
        status: "success",
        total_records: 1,
        success_records: 0,
        failed_records: 0,
        skipped_records: 1,
        message: "SKU not found in Daraz mirror. Nothing pushed.",
      });
    }

    return {
      success: true,
      sku: cleanSku,
      quantity: stockQty,
      total: 0,
      success_count: 0,
      failed_count: 0,
      skipped_count: 1,
      message: "SKU not found in Daraz mirror. Nothing pushed.",
    };
  }

  let successCount = 0;
  let failedCount = 0;
  const details = [];

  for (const match of matches) {
    const startedAt = new Date();

    try {
      const { account, credentials } = await getCachedAccountAndCredentials(
        cache,
        match.account_id
      );

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
        quantity: stockQty,
      });

      await Promise.all([
        model.updateDarazMirrorStock({
          account_id: match.account_id,
          seller_sku: cleanSku,
          quantity: stockQty,
        }),
        model.touchMarketplaceInventorySync(match.account_id, true),
        model.createInventorySyncLog({
          job_uid: jobUid,
          account_id: match.account_id,
          account_code: account.account_code,
          seller_sku: cleanSku,
          daraz_item_id: match.daraz_item_id,
          daraz_sku_id: match.daraz_sku_id,
          old_quantity: match.current_quantity,
          new_quantity: stockQty,
          source,
          sync_status: "success",
          message: "Stock pushed to Daraz successfully.",
          changed_by: userId,
          started_at: startedAt,
          finished_at: new Date(),
        }),
        logJobItem(jobId, {
          account_id: match.account_id,
          sku: cleanSku,
          daraz_item_id: match.daraz_item_id,
          status: "success",
          message: "Stock pushed to Daraz successfully.",
        }),
      ]);

      successCount += 1;
      details.push({
        account_id: match.account_id,
        seller_sku: cleanSku,
        daraz_item_id: match.daraz_item_id,
        daraz_sku_id: match.daraz_sku_id,
        status: "success",
      });
    } catch (error) {
      const darazError = getDarazError(error);
      failedCount += 1;

      await Promise.all([
        model.touchMarketplaceInventorySync(
          match.account_id,
          false,
          darazError.message || error.message
        ),
        model.createInventorySyncLog({
          job_uid: jobUid,
          account_id: match.account_id,
          seller_sku: cleanSku,
          daraz_item_id: match.daraz_item_id,
          daraz_sku_id: match.daraz_sku_id,
          old_quantity: match.current_quantity,
          new_quantity: stockQty,
          source,
          sync_status: "failed",
          error_code: darazError.code || error.code || null,
          error_message: darazError.message || error.message,
          request_id: darazError.request_id || null,
          trace_id: darazError.trace_id || null,
          changed_by: userId,
          started_at: startedAt,
          finished_at: new Date(),
        }),
        logJobItem(jobId, {
          account_id: match.account_id,
          sku: cleanSku,
          daraz_item_id: match.daraz_item_id,
          status: "failed",
          message: darazError.message || error.message,
          error_code: darazError.code || error.code || null,
          error_details: JSON.stringify(darazError),
        }),
      ]);

      details.push({
        account_id: match.account_id,
        seller_sku: cleanSku,
        daraz_item_id: match.daraz_item_id,
        daraz_sku_id: match.daraz_sku_id,
        status: "failed",
        message: darazError.message || error.message,
        code: darazError.code || error.code || null,
      });
    }
  }

  if (createOwnJob) {
    await finishJob(jobId, {
      status: failedCount > 0 && successCount > 0 ? "partial" : failedCount > 0 ? "failed" : "success",
      total_records: matches.length,
      success_records: successCount,
      failed_records: failedCount,
      skipped_records: 0,
      message: `Daraz stock push completed for ${cleanSku}.`,
      error_details: failedCount ? JSON.stringify(details.filter((item) => item.status === "failed")) : null,
    });
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

async function syncAllLocalInventoryToDaraz({ source = "scheduled_30_min", userId = null } = {}) {
  const { jobUid, jobId } = await createJob({
    source,
    userId,
    message: "Push all local inventory stock to linked Daraz SKUs.",
  });

  const rows = await model.getLocalInventoryRows({ limit: 10000, offset: 0 });

  let successRecords = 0;
  let failedRecords = 0;
  let skippedRecords = 0;

  const accountCache = new Map();

  const details = await mapWithConcurrency(rows, SYNC_CONCURRENCY, (row) =>
    pushSkuStockToDaraz({
      sku: row.sku,
      quantity: row.stock_qty,
      source,
      userId,
      jobUid,
      jobId,
      createOwnJob: false,
      accountCache,
    })
  );

  for (const result of details) {
    successRecords += result.success_count || 0;
    failedRecords += result.failed_count || 0;
    skippedRecords += result.skipped_count || 0;
  }

  await finishJob(jobId, {
    status: failedRecords > 0 && successRecords > 0 ? "partial" : failedRecords > 0 ? "failed" : "success",
    total_records: rows.length,
    success_records: successRecords,
    failed_records: failedRecords,
    skipped_records: skippedRecords,
    message: `Daraz inventory sync completed. Local SKUs checked: ${rows.length}.`,
    error_details: failedRecords ? JSON.stringify(details.filter((item) => item.failed_count > 0).slice(0, 50)) : null,
  });

  return {
    success: failedRecords === 0,
    total_local_skus: rows.length,
    success_records: successRecords,
    failed_records: failedRecords,
    skipped_records: skippedRecords,
    job_uid: jobUid,
  };
}

module.exports = {
  pushSkuStockToDaraz,
  syncAllLocalInventoryToDaraz,
};

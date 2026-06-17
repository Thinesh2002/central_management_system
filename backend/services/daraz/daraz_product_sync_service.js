const accountModel = require("../../models/daraz/daraz_account/daraz_account_model");
const productSyncModel = require("../../models/daraz/products_models/sync/daraz_product_sync_model");
const darazApi = require("./daraz_api_client");

const DEFAULT_BATCH_SIZE = Number(process.env.DARAZ_PRODUCT_BATCH_SIZE || process.env.TRACKER_BATCH_SIZE || 50);
const DEFAULT_CONCURRENCY = Number(process.env.DARAZ_ACCOUNT_SYNC_CONCURRENCY || 2);

const runWithConcurrency = async (items, limit, worker) => {
  const results = [];
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
};

const fetchProductsPage = async (account, offset = 0, limit = DEFAULT_BATCH_SIZE) => {
  return darazApi.callDarazApi({
    account,
    apiPath: "/products/get",
    method: "GET",
    params: {
      filter: "all",
      limit: String(limit),
      offset: String(offset),
      options: "1"
    },
    requiresAuth: true,
    retry: 1
  });
};

const syncSingleAccountProducts = async (account, { force = false, syncType = "cron" } = {}) => {
  const startedAt = new Date();
  const batchSize = DEFAULT_BATCH_SIZE;
  let offset = 0;
  let totalProducts = 0;
  let syncedProducts = 0;
  let syncedSkus = 0;
  let failedRecords = 0;

  try {
    if (!account?.access_token && !account?.refresh_token) {
      throw new Error(`Daraz tokens missing for account ${account.account_code}. Please authorize the account.`);
    }

    while (true) {
      const response = await fetchProductsPage(account, offset, batchSize);
      const products = response.data?.products || response.data?.Products || [];
      totalProducts = Number(response.data?.total_products || response.data?.TotalProducts || products.length || 0);

      if (!Array.isArray(products) || products.length === 0) break;

      for (const product of products) {
        try {
          if (!product.item_id && product.ItemId) product.item_id = product.ItemId;
          if (!product.item_id) {
            failedRecords += 1;
            continue;
          }

          const productId = await productSyncModel.upsertProduct(account, product);
          const skus = product.skus || product.Skus || product.SKUs || [];
          await productSyncModel.syncProductSkus(productId, account, product, skus);

          syncedProducts += 1;
          syncedSkus += Array.isArray(skus) ? skus.length : 0;
        } catch (recordError) {
          failedRecords += 1;
          console.error(`[DARAZ_PRODUCT_RECORD_FAIL][${account.account_code}]`, recordError.message);
        }
      }

      offset += batchSize;
      if (products.length < batchSize || (totalProducts > 0 && offset >= totalProducts)) break;
    }

    await accountModel.updateLastSync(account, "last_product_sync_at");
    await productSyncModel.createSyncLog({
      account_id: account.id || null,
      account_code: account.account_code,
      account_name: account.account_name,
      module: "products",
      sync_type: force ? "force" : syncType,
      status: failedRecords > 0 ? "partial" : "success",
      total_products: totalProducts,
      synced_products: syncedProducts,
      total_skus: syncedSkus,
      synced_skus: syncedSkus,
      failed_records: failedRecords,
      message: force ? "Manual forced Daraz product sync completed" : "Daraz product auto sync completed",
      started_at: startedAt,
      finished_at: new Date()
    });

    return {
      success: failedRecords === 0,
      partial: failedRecords > 0,
      account_code: account.account_code,
      account_name: account.account_name,
      total_products: totalProducts,
      synced_products: syncedProducts,
      synced_skus: syncedSkus,
      failed_records: failedRecords
    };
  } catch (error) {
    await productSyncModel.createSyncLog({
      account_id: account?.id || null,
      account_code: account?.account_code,
      account_name: account?.account_name,
      module: "products",
      sync_type: force ? "force" : syncType,
      status: "failed",
      total_products: totalProducts,
      synced_products: syncedProducts,
      total_skus: syncedSkus,
      synced_skus: syncedSkus,
      failed_records: failedRecords + 1,
      message: error.message,
      error,
      started_at: startedAt,
      finished_at: new Date()
    });

    return {
      success: false,
      account_code: account?.account_code,
      account_name: account?.account_name,
      total_products: totalProducts,
      synced_products: syncedProducts,
      synced_skus: syncedSkus,
      failed_records: failedRecords,
      message: error.message
    };
  }
};

const syncAllProducts = async ({ force = false, syncType = "cron", accountCode = null } = {}) => {
  const accounts = accountCode
    ? [await accountModel.getAccountByCode(accountCode)]
    : await accountModel.getAllAccounts({ activeOnly: true, includeTokens: true });

  const activeAccounts = accounts.filter(Boolean);
  const results = await runWithConcurrency(activeAccounts, DEFAULT_CONCURRENCY, (account) =>
    syncSingleAccountProducts(account, { force, syncType })
  );

  return {
    total_accounts: activeAccounts.length,
    successful_syncs: results.filter((result) => result.success).length,
    partial_syncs: results.filter((result) => result.partial).length,
    failed_syncs: results.filter((result) => !result.success && !result.partial).length,
    results
  };
};

module.exports = {
  syncAllProducts,
  syncSingleAccountProducts,
  fetchProductsPage
};

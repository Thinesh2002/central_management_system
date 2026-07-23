const brighthubModel = require("../../../models/marketplace/brighthub/brighthub_model");
const brighthubApi = require("../../marketplace/brighthub/brighthub_api_service");
const brighthubProductModel = require("../../../models/brighthub/product/brighthub_product_model");

async function syncBrightHubProductsForAccount(accountId, options = {}) {
  const triggeredByType = options.triggered_by_type || "user";
  const credentials = await brighthubModel.getBrightHubCredentials(accountId);

  const jobId = await brighthubProductModel.createSyncJob(accountId, triggeredByType);

  const summary = {
    job_id: jobId,
    account_id: Number(accountId),
    status: "running",
    total_records: 0,
    success_records: 0,
    failed_records: 0,
    skipped_records: 0,
    products_synced: 0,
    message: "BrightHub product sync running",
    error_details: null,
  };

  try {
    let page = 1;
    let totalPages = 1;
    const limit = 100;

    do {
      const result = await brighthubApi.getProducts(credentials, { page, limit });

      totalPages = result.total_pages || 1;

      const products = Array.isArray(result.data) ? result.data : [];

      for (const product of products) {
        summary.total_records += 1;

        try {
          await brighthubProductModel.upsertBrightHubProduct(accountId, product);

          summary.success_records += 1;
          summary.products_synced += 1;

          await brighthubProductModel.addSyncItem({
            jobId,
            accountId,
            itemType: "product",
            marketplaceReference: product.bhid || null,
            sku: product.sku || null,
            status: "success",
            message: "Product synced",
          });
        } catch (error) {
          summary.failed_records += 1;

          await brighthubProductModel.addSyncItem({
            jobId,
            accountId,
            itemType: "product",
            marketplaceReference: product?.bhid || null,
            sku: product?.sku || null,
            status: "failed",
            message: "Product sync failed",
            errorCode: "PRODUCT_SYNC_FAILED",
            errorDetails: error.message,
          });
        }
      }

      page += 1;
    } while (page <= totalPages);

    const finalStatus = await brighthubProductModel.finishSyncJob(jobId, {
      ...summary,
      message: `BrightHub product sync completed. Products: ${summary.products_synced}`,
    });

    summary.status = finalStatus;
    summary.message = "BrightHub product sync completed.";

    await brighthubProductModel.markAccountProductSync(
      accountId,
      finalStatus !== "failed",
      finalStatus === "failed" ? "BrightHub product sync failed." : null
    );

    return summary;
  } catch (error) {
    summary.status = "failed";
    summary.error_details = error.message;
    summary.message = "BrightHub product sync failed.";

    await brighthubProductModel.finishSyncJob(jobId, summary);
    await brighthubProductModel.markAccountProductSync(accountId, false, error.message);

    throw error;
  }
}

async function syncDueBrightHubProductAccounts() {
  const accounts = await brighthubProductModel.getDueBrightHubAccounts();

  const results = [];

  for (const account of accounts) {
    try {
      const result = await syncBrightHubProductsForAccount(account.account_id, {
        triggered_by_type: "system",
      });

      results.push({ account_id: account.account_id, account_name: account.account_name, success: true, result });
    } catch (error) {
      results.push({ account_id: account.account_id, account_name: account.account_name, success: false, error: error.message });
    }
  }

  return {
    checked_accounts: accounts.length,
    results,
  };
}

module.exports = {
  syncBrightHubProductsForAccount,
  syncDueBrightHubProductAccounts,
};

const wooModel = require("../../../models/marketplace/woo/woo_model");
const wooApi = require("../../marketplace/woo/woo_api_service");
const wooProductModel = require("../../../models/woo/product/woo_product_model");

async function syncWooProductsForAccount(accountId, options = {}) {
  const triggeredByType = options.triggered_by_type || "manual";
  const credentials = await wooModel.getWooCredentials(accountId);

  const jobId = await wooProductModel.createSyncJob(accountId, triggeredByType);

  const summary = {
    job_id: jobId,
    account_id: Number(accountId),
    status: "running",
    total_records: 0,
    success_records: 0,
    failed_records: 0,
    skipped_records: 0,
    products_synced: 0,
    variations_synced: 0,
    message: "WooCommerce product sync running",
    error_details: null,
  };

  try {
    let page = 1;
    let totalPages = 1;
    const perPage = 100;

    do {
      const result = await wooApi.getProducts(credentials, {
        page,
        per_page: perPage,
        orderby: "date",
        order: "desc",
      });

      totalPages = result.total_pages || 1;

      const products = Array.isArray(result.data) ? result.data : [];

      for (const product of products) {
        summary.total_records += 1;

        try {
          await wooProductModel.upsertWooProduct(accountId, product);

          summary.success_records += 1;
          summary.products_synced += 1;

          await wooProductModel.addSyncItem({
            jobId,
            accountId,
            itemType: "product",
            marketplaceReference: String(product.id),
            sku: product.sku || null,
            status: "success",
            message: "Product synced",
          });

          if (product.type === "variable") {
            const variationSummary = await syncProductVariations({
              accountId,
              jobId,
              credentials,
              product,
            });

            summary.total_records += variationSummary.total_records;
            summary.success_records += variationSummary.success_records;
            summary.failed_records += variationSummary.failed_records;
            summary.variations_synced += variationSummary.success_records;
          }
        } catch (error) {
          summary.failed_records += 1;

          await wooProductModel.addSyncItem({
            jobId,
            accountId,
            itemType: "product",
            marketplaceReference: product?.id ? String(product.id) : null,
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

    const finalStatus = await wooProductModel.finishSyncJob(jobId, {
      ...summary,
      message: `WooCommerce product sync completed. Products: ${summary.products_synced}, Variations: ${summary.variations_synced}`,
    });

    summary.status = finalStatus;
    summary.message = "WooCommerce product sync completed.";

    await wooProductModel.markAccountProductSync(
      accountId,
      finalStatus !== "failed",
      finalStatus === "failed" ? "WooCommerce product sync failed." : null
    );

    return summary;
  } catch (error) {
    summary.status = "failed";
    summary.error_details = error.message;
    summary.message = "WooCommerce product sync failed.";

    await wooProductModel.finishSyncJob(jobId, summary);
    await wooProductModel.markAccountProductSync(accountId, false, error.message);

    throw error;
  }
}

async function syncProductVariations({ accountId, jobId, credentials, product }) {
  const summary = {
    total_records: 0,
    success_records: 0,
    failed_records: 0,
  };

  let page = 1;
  let totalPages = 1;
  const perPage = 100;

  do {
    const result = await wooApi.getProductVariations(credentials, product.id, {
      page,
      per_page: perPage,
    });

    totalPages = result.total_pages || 1;

    const variations = Array.isArray(result.data) ? result.data : [];

    for (const variation of variations) {
      summary.total_records += 1;

      try {
        await wooProductModel.upsertWooVariation(accountId, product.id, variation);

        summary.success_records += 1;

        await wooProductModel.addSyncItem({
          jobId,
          accountId,
          itemType: "variant",
          marketplaceReference: String(variation.id),
          sku: variation.sku || null,
          status: "success",
          message: "Variation synced",
        });
      } catch (error) {
        summary.failed_records += 1;

        await wooProductModel.addSyncItem({
          jobId,
          accountId,
          itemType: "variant",
          marketplaceReference: variation?.id ? String(variation.id) : null,
          sku: variation?.sku || null,
          status: "failed",
          message: "Variation sync failed",
          errorCode: "VARIATION_SYNC_FAILED",
          errorDetails: error.message,
        });
      }
    }

    page += 1;
  } while (page <= totalPages);

  return summary;
}

async function syncDueWooProductAccounts() {
  const accounts = await wooProductModel.getDueWooAccounts();

  const results = [];

  for (const account of accounts) {
    try {
      const result = await syncWooProductsForAccount(account.account_id, {
        triggered_by_type: "scheduler",
      });

      results.push({
        account_id: account.account_id,
        account_name: account.account_name,
        success: true,
        result,
      });
    } catch (error) {
      results.push({
        account_id: account.account_id,
        account_name: account.account_name,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    checked_accounts: accounts.length,
    results,
  };
}

module.exports = {
  syncWooProductsForAccount,
  syncDueWooProductAccounts,
};
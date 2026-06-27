const cron = require("node-cron");
const wooProductSyncService = require("../../../services/woo/product/woo_product_sync_service");

let isRunning = false;

function startWooProductSyncJob() {
  cron.schedule("*/15 * * * *", async () => {
    if (isRunning) {
      console.log("[WOO_PRODUCT_SYNC_JOB]: Previous job still running. Skipped.");
      return;
    }

    isRunning = true;

    try {
      console.log("[WOO_PRODUCT_SYNC_JOB]: Checking due WooCommerce accounts...");

      const result = await wooProductSyncService.syncDueWooProductAccounts();

      console.log("[WOO_PRODUCT_SYNC_JOB]: Completed", {
        checked_accounts: result.checked_accounts,
      });
    } catch (error) {
      console.error("[WOO_PRODUCT_SYNC_JOB_ERROR]:", error.message);
    } finally {
      isRunning = false;
    }
  });

  console.log("[WOO_PRODUCT_SYNC_JOB]: Started. Runs every 15 minutes.");
}

module.exports = {
  startWooProductSyncJob,
};
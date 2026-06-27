const cron = require("node-cron");
const wooProductSyncService = require("../../../services/woo/product/woo_product_sync_service");

let isRunning = false;

function startWooProductSyncJob() {
  cron.schedule("*/15 * * * *", async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;

    try {

      const result = await wooProductSyncService.syncDueWooProductAccounts();

    } catch (error) {
      console.error("[WOO_PRODUCT_SYNC_JOB_ERROR]:", error.message);
    } finally {
      isRunning = false;
    }
  });

}

module.exports = {
  startWooProductSyncJob,
};
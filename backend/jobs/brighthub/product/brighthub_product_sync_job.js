const cron = require("node-cron");
const brighthubProductSyncService = require("../../../services/brighthub/product/brighthub_product_sync_service");

let isRunning = false;

function startBrightHubProductSyncJob() {
  cron.schedule("*/15 * * * *", async () => {
    if (isRunning) {
      console.log("[BRIGHTHUB_PRODUCT_SYNC_JOB]: Previous job still running. Skipped.");
      return;
    }

    isRunning = true;

    try {
      console.log("[BRIGHTHUB_PRODUCT_SYNC_JOB]: Checking due BrightHub accounts...");

      const result = await brighthubProductSyncService.syncDueBrightHubProductAccounts();

      console.log("[BRIGHTHUB_PRODUCT_SYNC_JOB]: Completed", {
        checked_accounts: result.checked_accounts,
      });
    } catch (error) {
      console.error("[BRIGHTHUB_PRODUCT_SYNC_JOB_ERROR]:", error.message);
    } finally {
      isRunning = false;
    }
  });

  console.log("[BRIGHTHUB_PRODUCT_SYNC_JOB]: Started. Runs every 15 minutes.");
}

module.exports = {
  startBrightHubProductSyncJob,
};

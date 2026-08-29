const cron = require("node-cron");
const brighthubProductPushService = require("../../../services/brighthub/product/brighthub_product_push_service");

let isRunning = false;

function startBrightHubProductPushJob() {
  cron.schedule("*/30 * * * *", async () => {
    if (isRunning) {
      console.log("[BRIGHTHUB_PRODUCT_PUSH_JOB]: Previous run still in progress. Skipped.");
      return;
    }

    isRunning = true;

    try {
      console.log("[BRIGHTHUB_PRODUCT_PUSH_JOB]: Pushing new local catalog products to BrightHub...");

      const result = await brighthubProductPushService.pushDueBrightHubAccounts();

      console.log("[BRIGHTHUB_PRODUCT_PUSH_JOB]: Completed", {
        checked_accounts: result.checked_accounts,
      });
    } catch (error) {
      console.error("[BRIGHTHUB_PRODUCT_PUSH_JOB_ERROR]:", error.message);
    } finally {
      isRunning = false;
    }
  });

  console.log("[BRIGHTHUB_PRODUCT_PUSH_JOB]: Started. Runs every 30 minutes.");
}

module.exports = {
  startBrightHubProductPushJob,
};

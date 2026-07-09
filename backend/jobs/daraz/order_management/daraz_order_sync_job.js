const cron = require("node-cron");

const accountModel = require("../../../models/marketplace/account_model");
const darazOrderSyncService = require("../../../services/daraz/order_management/daraz_order_sync_service");

let isRunning = false;

async function syncAllDarazOrders() {
  if (isRunning) {
    console.log("[DARAZ_ORDER_SYNC] Previous sync still running. Skipped.");
    return;
  }

  isRunning = true;

  try {
    console.log("[DARAZ_ORDER_SYNC] Auto sync started.");

    const accounts = await accountModel.listActiveDarazAccounts();
    const { days, results } = await darazOrderSyncService.syncAllAccounts(accounts);

    console.log(`[DARAZ_ORDER_SYNC] Auto sync finished. Window: last ${days} days.`);
    results.forEach((result) => {
      if (!result.success) {
        console.error(`[DARAZ_ORDER_SYNC] Account ${result.account_id} failed: ${result.error}`);
      }
    });
  } catch (error) {
    console.error("[DARAZ_ORDER_SYNC] Job failed:", error.message);
  } finally {
    isRunning = false;
  }
}

function startDarazOrderSyncJob() {
  cron.schedule("*/30 * * * *", syncAllDarazOrders, {
    timezone: "Asia/Colombo",
  });

  console.log("[DARAZ_ORDER_SYNC] Scheduler started. Runs every 30 minutes.");
}

module.exports = {
  startDarazOrderSyncJob,
  syncAllDarazOrders,
};

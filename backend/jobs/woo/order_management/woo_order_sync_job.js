const cron = require("node-cron");

const wooModel = require("../../../models/marketplace/woo/woo_model");
const wooOrderSyncService = require("../../../services/woo/order_management/woo_order_sync_service");

let isRunning = false;

async function syncAllWooOrders() {
  if (isRunning) {
    console.log("[WOO_ORDER_SYNC] Previous sync still running. Skipped.");
    return;
  }

  isRunning = true;

  try {
    console.log("[WOO_ORDER_SYNC] Auto sync started.");

    const accounts = await wooModel.listActiveWooAccounts();
    const { days, results } = await wooOrderSyncService.syncAllAccounts(accounts);

    console.log(`[WOO_ORDER_SYNC] Auto sync finished. Window: last ${days} days.`);
    results.forEach((result) => {
      if (!result.success) {
        console.error(`[WOO_ORDER_SYNC] Account ${result.account_id} failed: ${result.error}`);
      }
    });
  } catch (error) {
    console.error("[WOO_ORDER_SYNC] Job failed:", error.message);
  } finally {
    isRunning = false;
  }
}

function startWooOrderSyncJob() {
  cron.schedule("*/30 * * * *", syncAllWooOrders, {
    timezone: "Asia/Colombo",
  });

  console.log("[WOO_ORDER_SYNC] Scheduler started. Runs every 30 minutes.");
}

module.exports = {
  startWooOrderSyncJob,
  syncAllWooOrders,
};

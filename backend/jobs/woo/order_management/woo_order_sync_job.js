const cron = require("node-cron");

const wooModel = require("../../../models/marketplace/woo/woo_model");
const wooOrderSyncService = require("../../../services/woo/order_management/woo_order_sync_service");
const orderSyncSettingsModel = require("../../../models/order_management/order_sync_settings_model");

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

// Same shared order_sync_settings row Daraz's sync job reads (fetch_order_days
// already worked this way) - checked every 5 minutes so sync_interval_minutes
// actually has an effect instead of the old hardcoded */30 schedule ignoring
// it. sync_enabled/auto_sync_enabled are enforced here too; "Run Sync Now"
// calls syncAllWooOrders() directly and is never gated by this check.
async function runScheduledWooSync() {
  try {
    const settings = await orderSyncSettingsModel.getSettings();

    if (!orderSyncSettingsModel.isScheduledSyncDue(settings)) {
      return;
    }

    await syncAllWooOrders();
  } catch (error) {
    console.error("[WOO_ORDER_SYNC] Scheduled check failed:", error.message);
  }
}

function startWooOrderSyncJob() {
  cron.schedule("*/5 * * * *", runScheduledWooSync, {
    timezone: "Asia/Colombo",
  });

  console.log(
    "[WOO_ORDER_SYNC] Scheduler started. Checks every 5 minutes, actually syncs per the saved sync_interval_minutes/sync_enabled/auto_sync_enabled settings."
  );
}

module.exports = {
  startWooOrderSyncJob,
  syncAllWooOrders,
};

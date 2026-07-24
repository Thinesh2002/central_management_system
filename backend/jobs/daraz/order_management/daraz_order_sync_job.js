const cron = require("node-cron");

const accountModel = require("../../../models/marketplace/account_model");
const darazOrderSyncService = require("../../../services/daraz/order_management/daraz_order_sync_service");
const orderSyncSettingsModel = require("../../../models/order_management/order_sync_settings_model");

let isRunning = false;

async function syncAllDarazOrders() {
  if (isRunning) {
    console.log("[DARAZ_ORDER_SYNC] Previous sync still running. Skipped.");
    return;
  }

  isRunning = true;
  await orderSyncSettingsModel.recordSyncStart().catch(() => {});

  try {
    console.log("[DARAZ_ORDER_SYNC] Auto sync started.");

    const accounts = await accountModel.listActiveDarazAccounts();
    const { days, results } = await darazOrderSyncService.syncAllAccounts(accounts);

    console.log(`[DARAZ_ORDER_SYNC] Auto sync finished. Window: last ${days} days.`);

    const failed = results.filter((result) => !result.success);
    failed.forEach((result) => {
      console.error(`[DARAZ_ORDER_SYNC] Account ${result.account_id} failed: ${result.error}`);
    });

    await orderSyncSettingsModel
      .recordSyncResult({
        success: failed.length === 0,
        errorMessage: failed.length ? failed.map((result) => result.error).join("; ") : null,
      })
      .catch(() => {});
  } catch (error) {
    console.error("[DARAZ_ORDER_SYNC] Job failed:", error.message);
    await orderSyncSettingsModel.recordSyncResult({ success: false, errorMessage: error.message }).catch(() => {});
  } finally {
    isRunning = false;
  }
}

// Checked every 5 minutes so sync_interval_minutes (e.g. 5, 15, 60...) can
// actually take effect - the cron expression itself can't be re-scheduled
// dynamically from a saved setting, so this ticks frequently and only
// actually syncs once isScheduledSyncDue() says enough time has passed
// (same daily-check-with-gate pattern used elsewhere in this codebase).
// sync_enabled/auto_sync_enabled are also enforced here; "Run Sync Now"
// calls syncAllDarazOrders() directly and is never gated by this check.
async function runScheduledDarazSync() {
  try {
    const settings = await orderSyncSettingsModel.getSettings();

    if (!orderSyncSettingsModel.isScheduledSyncDue(settings)) {
      return;
    }

    await syncAllDarazOrders();
  } catch (error) {
    console.error("[DARAZ_ORDER_SYNC] Scheduled check failed:", error.message);
  }
}

function startDarazOrderSyncJob() {
  cron.schedule("*/5 * * * *", runScheduledDarazSync, {
    timezone: "Asia/Colombo",
  });

  console.log(
    "[DARAZ_ORDER_SYNC] Scheduler started. Checks every 5 minutes, actually syncs per the saved sync_interval_minutes/sync_enabled/auto_sync_enabled settings."
  );
}

module.exports = {
  startDarazOrderSyncJob,
  syncAllDarazOrders,
};

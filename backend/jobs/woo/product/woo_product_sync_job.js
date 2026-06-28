const cron = require("node-cron");
const wooProductSyncService = require("../../../services/woo/product/woo_product_sync_service");
const stockService = require("../../../services/inventory/marketplace_stock_service");
const { recordAutomationRun } = require("../../../services/system/automation_log_service");

let isRunning = false;

function getIntervalMinutes() {
  const value = Number(process.env.WOO_PRODUCT_SYNC_INTERVAL_MINUTES || 30);
  if (!Number.isFinite(value)) return 30;
  return Math.min(Math.max(value, 10), 180);
}

async function runWooProductSync() {
  if (isRunning) return { skipped: true, reason: "previous_run_still_running" };

  isRunning = true;
  const startedAt = new Date();

  try {
    const settings = await stockService.getStockSettings();
    if (!settings.woo_auto_product_sync) {
      const skipped = { skipped: true, reason: "woo_auto_product_sync_disabled" };
      await recordAutomationRun({ jobName: "WOO_PRODUCT_SYNC", jobType: "product_sync", status: "skipped", summary: skipped, startedAt });
      return skipped;
    }

    const result = await wooProductSyncService.syncDueWooProductAccounts();
    const success = (result.results || []).filter((item) => item.success).length;
    const failed = (result.results || []).filter((item) => !item.success).length;

    console.log(`[WOO_PRODUCT_SYNC] Accounts: ${result.checked_accounts || 0} | Success: ${success} | Failed: ${failed}`);
    await recordAutomationRun({ jobName: "WOO_PRODUCT_SYNC", jobType: "product_sync", status: failed ? "partial" : "success", summary: { ...result, success, failed, checked_accounts: result.checked_accounts || 0 }, startedAt });
    return result;
  } catch (error) {
    console.error("[WOO_PRODUCT_SYNC_ERROR]:", error.message);
    const failedSummary = { error: error.message };
    await recordAutomationRun({ jobName: "WOO_PRODUCT_SYNC", jobType: "product_sync", status: "failed", summary: failedSummary, error, startedAt });
    return failedSummary;
  } finally {
    isRunning = false;
  }
}

function startWooProductSyncJob() {
  runWooProductSync();
  cron.schedule(`*/${getIntervalMinutes()} * * * *`, runWooProductSync, { timezone: "Asia/Colombo" });
  console.log(`[WOO_PRODUCT_SYNC] Scheduler started. Runs every ${getIntervalMinutes()} minutes.`);
}

module.exports = {
  startWooProductSyncJob,
  runWooProductSync,
};

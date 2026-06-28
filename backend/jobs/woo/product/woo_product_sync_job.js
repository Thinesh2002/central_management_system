const cron = require("node-cron");
const wooProductSyncService = require("../../../services/woo/product/woo_product_sync_service");
const stockService = require("../../../services/inventory/marketplace_stock_service");

let isRunning = false;

function getIntervalMinutes() {
  const value = Number(process.env.WOO_PRODUCT_SYNC_INTERVAL_MINUTES || 30);
  if (!Number.isFinite(value)) return 30;
  return Math.min(Math.max(value, 10), 180);
}

async function runWooProductSync() {
  if (isRunning) return { skipped: true, reason: "previous_run_still_running" };

  isRunning = true;

  try {
    const settings = await stockService.getStockSettings();
    if (!settings.woo_auto_product_sync) return { skipped: true, reason: "woo_auto_product_sync_disabled" };

    const result = await wooProductSyncService.syncDueWooProductAccounts();
    const success = (result.results || []).filter((item) => item.success).length;
    const failed = (result.results || []).filter((item) => !item.success).length;

    console.log(`[WOO_PRODUCT_SYNC] Accounts: ${result.checked_accounts || 0} | Success: ${success} | Failed: ${failed}`);
    return result;
  } catch (error) {
    console.error("[WOO_PRODUCT_SYNC_ERROR]:", error.message);
    return { error: error.message };
  } finally {
    isRunning = false;
  }
}

function startWooProductSyncJob() {
  cron.schedule(`*/${getIntervalMinutes()} * * * *`, runWooProductSync, { timezone: "Asia/Colombo" });
  console.log(`[WOO_PRODUCT_SYNC] Scheduler started. Runs every ${getIntervalMinutes()} minutes.`);
}

module.exports = {
  startWooProductSyncJob,
  runWooProductSync,
};

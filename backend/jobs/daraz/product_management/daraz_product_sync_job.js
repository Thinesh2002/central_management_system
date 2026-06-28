const cron = require("node-cron");

const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");
const darazProductSyncService = require("../../../services/daraz/product_management/daraz_product_sync_service");
const stockService = require("../../../services/inventory/marketplace_stock_service");
const { recordAutomationRun } = require("../../../services/system/automation_log_service");

let isRunning = false;

function getIntervalMinutes() {
  const value = Number(process.env.DARAZ_PRODUCT_SYNC_INTERVAL_MINUTES || 30);
  if (!Number.isFinite(value)) return 30;
  return Math.min(Math.max(value, 10), 180);
}

async function syncAllDarazAccounts() {
  if (isRunning) return { skipped: true, reason: "previous_run_still_running" };

  isRunning = true;
  const startedAt = new Date();
  const summary = { accounts: 0, success: 0, failed: 0 };

  try {
    const settings = await stockService.getStockSettings();
    if (!settings.daraz_auto_product_sync) {
      const skipped = { ...summary, skipped: true, reason: "daraz_auto_product_sync_disabled" };
      await recordAutomationRun({ jobName: "DARAZ_PRODUCT_SYNC", jobType: "product_sync", status: "skipped", summary: skipped, startedAt });
      return skipped;
    }

    const accounts = await accountModel.listActiveDarazAccounts();
    summary.accounts = accounts.length;

    for (const account of accounts) {
      try {
        const credentials = await credentialModel.findByAccountId(account.id);

        if (!credentials?.access_token) {
          summary.failed += 1;
          continue;
        }

        await darazProductSyncService.syncDarazProducts({
          account,
          credentials,
          sync_type: "auto",
          withDetail: false,
        });

        summary.success += 1;
      } catch (_) {
        summary.failed += 1;
      }
    }

    console.log(`[DARAZ_PRODUCT_SYNC] Accounts: ${summary.accounts} | Success: ${summary.success} | Failed: ${summary.failed}`);
    await recordAutomationRun({ jobName: "DARAZ_PRODUCT_SYNC", jobType: "product_sync", status: summary.failed ? "partial" : "success", summary, startedAt });
    return summary;
  } catch (error) {
    console.error("[DARAZ_PRODUCT_SYNC_ERROR]:", error.message);
    const failedSummary = { ...summary, error: error.message };
    await recordAutomationRun({ jobName: "DARAZ_PRODUCT_SYNC", jobType: "product_sync", status: "failed", summary: failedSummary, error, startedAt });
    return failedSummary;
  } finally {
    isRunning = false;
  }
}

function startDarazProductSyncJob() {
  syncAllDarazAccounts();
  cron.schedule(`*/${getIntervalMinutes()} * * * *`, syncAllDarazAccounts, {
    timezone: "Asia/Colombo",
  });

  console.log(`[DARAZ_PRODUCT_SYNC] Scheduler started. Runs every ${getIntervalMinutes()} minutes.`);
}

module.exports = {
  startDarazProductSyncJob,
  syncAllDarazAccounts,
};

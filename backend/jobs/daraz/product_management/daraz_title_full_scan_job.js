const cron = require("node-cron");

const accountModel = require("../../../models/marketplace/account_model");
const titleScanService = require("../../../services/daraz/product_management/daraz_title_scan_service");

const SCAN_LIMIT = 100;
const SUGGESTION_COOLDOWN_DAYS = 30;

let running = false;

async function runFullCatalogScanForAllAccounts() {
  if (running) {
    console.log("[DARAZ_TITLE_FULL_SCAN_JOB] Previous run still in progress. Skipped.");
    return;
  }

  running = true;

  try {
    const accounts = await accountModel.listActiveDarazAccounts();

    for (const account of accounts) {
      try {
        const result = await titleScanService.scanAccountForTitleSuggestions({
          accountId: account.id,
          limit: SCAN_LIMIT,
          userId: null,
          mode: "manual",
          staleDays: SUGGESTION_COOLDOWN_DAYS,
        });

        console.log(
          `[DARAZ_TITLE_FULL_SCAN_JOB] Account ${account.id}: ${result.succeeded} title suggestions generated (${result.failed} failed).`
        );
      } catch (accountError) {
        console.error(`[DARAZ_TITLE_FULL_SCAN_JOB] Failed account ${account.id}:`, accountError.message);
      }
    }
  } catch (error) {
    console.error("[DARAZ_TITLE_FULL_SCAN_JOB] Job failed:", error.message);
  } finally {
    running = false;
  }
}

function startDarazTitleFullScanJob() {
  cron.schedule("0 0 * * *", runFullCatalogScanForAllAccounts, { timezone: "Asia/Colombo" });
  console.log("[DARAZ_TITLE_FULL_SCAN_JOB] Scheduler started. Full-catalog title scan nightly at 00:00 Colombo (skips anything suggested in the last 30 days).");
}

module.exports = { startDarazTitleFullScanJob, runFullCatalogScanForAllAccounts };

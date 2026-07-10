const cron = require("node-cron");

const accountModel = require("../../../models/marketplace/account_model");
const titleScanService = require("../../../services/daraz/product_management/daraz_title_scan_service");

const STALE_DAYS = 14;
const SCAN_LIMIT = 200;

let running = false;

async function regenerateStaleTitlesForAllAccounts() {
  if (running) {
    console.log("[DARAZ_TITLE_OPTIMIZER_JOB] Previous run still in progress. Skipped.");
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
          mode: "stale",
          staleDays: STALE_DAYS,
        });

        console.log(
          `[DARAZ_TITLE_OPTIMIZER_JOB] Account ${account.id}: ${result.succeeded} stale-listing title suggestions generated (${result.failed} failed).`
        );
      } catch (accountError) {
        console.error(`[DARAZ_TITLE_OPTIMIZER_JOB] Failed account ${account.id}:`, accountError.message);
      }
    }
  } catch (error) {
    console.error("[DARAZ_TITLE_OPTIMIZER_JOB] Job failed:", error.message);
  } finally {
    running = false;
  }
}

function startDarazTitleOptimizerJob() {
  cron.schedule("0 5 * * *", regenerateStaleTitlesForAllAccounts, { timezone: "Asia/Colombo" });
  console.log("[DARAZ_TITLE_OPTIMIZER_JOB] Scheduler started. Stale-listing (no sales in 14 days) title regeneration daily at 05:00 Colombo.");
}

module.exports = { startDarazTitleOptimizerJob, regenerateStaleTitlesForAllAccounts };

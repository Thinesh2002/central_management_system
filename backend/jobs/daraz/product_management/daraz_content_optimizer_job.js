const cron = require("node-cron");

const accountModel = require("../../../models/marketplace/account_model");
const contentScanService = require("../../../services/daraz/product_management/daraz_content_scan_service");

const SCAN_LIMIT = 100;
const SUGGESTION_COOLDOWN_DAYS = 30;

let running = false;

async function runFullCatalogContentScanForAllAccounts() {
  if (running) {
    console.log("[DARAZ_CONTENT_OPTIMIZER_JOB] Previous run still in progress. Skipped.");
    return;
  }

  running = true;

  try {
    const accounts = await accountModel.listActiveDarazAccounts();

    for (const account of accounts) {
      try {
        const result = await contentScanService.scanAccountForContentOptimization({
          accountId: account.id,
          limit: SCAN_LIMIT,
          userId: null,
          mode: "manual",
          staleDays: SUGGESTION_COOLDOWN_DAYS,
        });

        console.log(
          `[DARAZ_CONTENT_OPTIMIZER_JOB] Account ${account.id}: ${result.succeeded} product(s) analyzed (${result.failed} failed).`
        );
      } catch (accountError) {
        console.error(`[DARAZ_CONTENT_OPTIMIZER_JOB] Failed account ${account.id}:`, accountError.message);
      }
    }
  } catch (error) {
    console.error("[DARAZ_CONTENT_OPTIMIZER_JOB] Job failed:", error.message);
  } finally {
    running = false;
  }
}

function startDarazContentOptimizerJob() {
  cron.schedule("0 0 * * *", runFullCatalogContentScanForAllAccounts, { timezone: "Asia/Colombo" });
  console.log(
    "[DARAZ_CONTENT_OPTIMIZER_JOB] Scheduler started. Full-catalog AI content analysis nightly at 00:00 Colombo (skips anything analyzed in the last 30 days)."
  );
}

module.exports = { startDarazContentOptimizerJob, runFullCatalogContentScanForAllAccounts };

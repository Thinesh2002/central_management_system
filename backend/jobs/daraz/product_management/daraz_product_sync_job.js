const cron = require("node-cron");

const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");
const darazProductSyncService = require("../../../services/daraz/product_management/daraz_product_sync_service");

let isRunning = false;

async function syncAllDarazAccounts() {
  if (isRunning) {
    console.log("[DARAZ_PRODUCT_SYNC] Previous sync still running. Skipped.");
    return;
  }

  isRunning = true;

  try {
    console.log("[DARAZ_PRODUCT_SYNC] Auto sync started.");

    const accounts = await accountModel.listActiveDarazAccounts();

    for (const account of accounts) {
      try {
        const credentials = await credentialModel.findByAccountId(account.id);

        if (!credentials?.access_token) {
          console.log(`[DARAZ_PRODUCT_SYNC] Token missing for account ${account.id}`);
          continue;
        }

        await darazProductSyncService.syncDarazProducts({
          account,
          credentials,
          sync_type: "auto",
          withDetail: false,
        });

        console.log(`[DARAZ_PRODUCT_SYNC] Success account ${account.id}`);
      } catch (accountError) {
        console.error(
          `[DARAZ_PRODUCT_SYNC] Failed account ${account.id}:`,
          accountError.message
        );
      }
    }

    console.log("[DARAZ_PRODUCT_SYNC] Auto sync finished.");
  } catch (error) {
    console.error("[DARAZ_PRODUCT_SYNC] Job failed:", error.message);
  } finally {
    isRunning = false;
  }
}

function startDarazProductSyncJob() {
  cron.schedule("*/30 * * * *", syncAllDarazAccounts, {
    timezone: "Asia/Colombo",
  });

  console.log("[DARAZ_PRODUCT_SYNC] Scheduler started. Runs every 30 minutes.");
}

module.exports = {
  startDarazProductSyncJob,
  syncAllDarazAccounts,
};
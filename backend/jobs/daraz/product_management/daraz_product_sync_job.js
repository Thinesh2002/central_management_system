const cron = require("node-cron");

const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");
const darazProductSyncService = require("../../../services/daraz/product_management/daraz_product_sync_service");

let isRunning = false;

async function syncAllDarazAccounts() {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {

    const accounts = await accountModel.listActiveDarazAccounts();

    for (const account of accounts) {
      try {
        const credentials = await credentialModel.findByAccountId(account.id);

        if (!credentials?.access_token) {
          continue;
        }

        await darazProductSyncService.syncDarazProducts({
          account,
          credentials,
          sync_type: "auto",
          withDetail: false,
        });

      } catch (accountError) {
        console.error(
          `[DARAZ_PRODUCT_SYNC] Failed account ${account.id}:`,
          accountError.message
        );
      }
    }

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

}

module.exports = {
  startDarazProductSyncJob,
  syncAllDarazAccounts,
};
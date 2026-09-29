const cron = require("node-cron");

const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");
const darazFinanceSyncService = require("../../../services/daraz/finance_management/daraz_finance_sync_service");

let payoutRunning = false;
let transactionRunning = false;
let accountTransactionRunning = false;

async function syncAllDarazPayouts() {
  if (payoutRunning) {
    console.log("[DARAZ_FINANCE_PAYOUT_SYNC] Previous sync still running. Skipped.");
    return;
  }

  payoutRunning = true;

  try {
    console.log("[DARAZ_FINANCE_PAYOUT_SYNC] Auto sync started.");

    const accounts = await accountModel.listActiveDarazAccounts();

    for (const account of accounts) {
      try {
        const credentials = await credentialModel.findByAccountId(account.id);

        if (!credentials?.access_token) {
          console.log(`[DARAZ_FINANCE_PAYOUT_SYNC] Token missing for account ${account.id}`);
          continue;
        }

        await darazFinanceSyncService.syncPayouts({ account, credentials, sync_type: "auto" });
        console.log(`[DARAZ_FINANCE_PAYOUT_SYNC] Success account ${account.id}`);
      } catch (accountError) {
        console.error(`[DARAZ_FINANCE_PAYOUT_SYNC] Failed account ${account.id}:`, accountError.message);
      }
    }

    console.log("[DARAZ_FINANCE_PAYOUT_SYNC] Auto sync finished.");
  } catch (error) {
    console.error("[DARAZ_FINANCE_PAYOUT_SYNC] Job failed:", error.message);
  } finally {
    payoutRunning = false;
  }
}

async function syncAllDarazTransactions() {
  if (transactionRunning) {
    console.log("[DARAZ_FINANCE_TRANSACTION_SYNC] Previous sync still running. Skipped.");
    return;
  }

  transactionRunning = true;

  try {
    console.log("[DARAZ_FINANCE_TRANSACTION_SYNC] Auto sync started.");

    const accounts = await accountModel.listActiveDarazAccounts();

    for (const account of accounts) {
      try {
        const credentials = await credentialModel.findByAccountId(account.id);

        if (!credentials?.access_token) {
          console.log(`[DARAZ_FINANCE_TRANSACTION_SYNC] Token missing for account ${account.id}`);
          continue;
        }

        await darazFinanceSyncService.syncTransactions({ account, credentials, sync_type: "auto" });
        console.log(`[DARAZ_FINANCE_TRANSACTION_SYNC] Success account ${account.id}`);
      } catch (accountError) {
        console.error(`[DARAZ_FINANCE_TRANSACTION_SYNC] Failed account ${account.id}:`, accountError.message);
      }
    }

    console.log("[DARAZ_FINANCE_TRANSACTION_SYNC] Auto sync finished.");
  } catch (error) {
    console.error("[DARAZ_FINANCE_TRANSACTION_SYNC] Job failed:", error.message);
  } finally {
    transactionRunning = false;
  }
}

async function syncAllDarazAccountTransactions() {
  if (accountTransactionRunning) {
    console.log("[DARAZ_FINANCE_ACCOUNT_TRANSACTION_SYNC] Previous sync still running. Skipped.");
    return;
  }
  accountTransactionRunning = true;
  try {
    const accounts = await accountModel.listActiveDarazAccounts();
    for (const account of accounts) {
      try {
        const credentials = await credentialModel.findByAccountId(account.id);
        if (!credentials?.access_token) continue;
        await darazFinanceSyncService.syncAccountTransactions({ account, credentials, sync_type: "auto" });
      } catch (accountError) {
        console.error(`[DARAZ_FINANCE_ACCOUNT_TRANSACTION_SYNC] Failed account ${account.id}:`, accountError.message);
      }
    }
  } catch (error) {
    console.error("[DARAZ_FINANCE_ACCOUNT_TRANSACTION_SYNC] Job failed:", error.message);
  } finally {
    accountTransactionRunning = false;
  }
}

function startDarazFinanceSyncJob() {
  // Payout statements: every 6 hours, per Daraz GetPayoutStatus docs.
  cron.schedule("0 */6 * * *", syncAllDarazPayouts, { timezone: "Asia/Colombo" });

  // Transaction details: every 1 hour, per Daraz QueryTransactionDetails docs.
  cron.schedule("0 * * * *", syncAllDarazTransactions, { timezone: "Asia/Colombo" });
  cron.schedule("15 * * * *", syncAllDarazAccountTransactions, { timezone: "Asia/Colombo" });

  console.log("[DARAZ_FINANCE_SYNC] Scheduler started. Payouts every 6h, order and account transactions every 1h.");
}

module.exports = {
  startDarazFinanceSyncJob,
  syncAllDarazPayouts,
  syncAllDarazTransactions,
  syncAllDarazAccountTransactions,
};

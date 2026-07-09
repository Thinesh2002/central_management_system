const tokenService = require("../../marketplace/token_service");
const orderSyncSettingsModel = require("../../../models/order_management/order_sync_settings_model");

// The Daraz Order API (GetOrders/GetOrderItems) hasn't been wired up yet —
// this file is the real entry point the cron job and the manual "Sync Now"
// button both call, so plugging in the actual Daraz calls later only means
// filling in fetchDarazOrders() below. Everything around it (day-range
// resolution, per-account looping, error isolation) is already wired.
async function fetchDarazOrders({ account, credentials, sinceDate }) {
  throw new Error(
    "Daraz Order API integration is not yet connected. Share the Daraz Order API docs (GetOrders/GetOrderItems) to enable real order sync."
  );
}

function resolveSyncDays(settings) {
  const candidateKeys = [
    "sync_days",
    "days_back",
    "lookback_days",
    "sync_range_days",
    "order_sync_days",
  ];

  for (const key of candidateKeys) {
    const value = Number(settings?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }

  return 7;
}

async function syncOneAccount(account, sinceDate) {
  const credentials = await tokenService.getValidCredentialsForAccount(account.id);
  return fetchDarazOrders({ account, credentials, sinceDate });
}

async function syncAllAccounts(accounts) {
  const settings = await orderSyncSettingsModel.getSettings();
  const days = resolveSyncDays(settings);

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const results = [];

  for (const account of accounts) {
    try {
      const result = await syncOneAccount(account, sinceDate);
      results.push({ account_id: account.id, success: true, ...result });
    } catch (error) {
      results.push({ account_id: account.id, success: false, error: error.message });
    }
  }

  return { days, since: sinceDate, results };
}

module.exports = { syncAllAccounts, syncOneAccount, resolveSyncDays, fetchDarazOrders };

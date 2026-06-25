const cron = require("node-cron");
const orderModel = require("../../../models/daraz/daraz_orders/daraz_order_model");
const orderService = require("../../../services/daraz/daraz_orders/daraz_order_service");
const accountModel = require("../../../models/marketplace/account_model");

let isRunning = false;

async function getDarazAccounts() {
  if (typeof accountModel.getAllAccounts !== "function") return [];
  const accounts = await accountModel.getAllAccounts();
  return accounts.filter((a) => {
    const platform = String(a.platform_code || a.platform || "DARAZ").toUpperCase();
    return platform === "DARAZ" && String(a.status || "active").toLowerCase() !== "inactive";
  });
}

function isoMinutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function startDarazOrderSyncJob() {
  cron.schedule("*/10 * * * *", async () => {
    if (isRunning) {
      console.log("[DARAZ_ORDER_SYNC_JOB]: Previous job still running. Skipping.");
      return;
    }

    isRunning = true;
    try {
      const settings = await orderModel.getSyncSettings();
      if (settings && Number(settings.auto_sync_enabled) !== 1) {
        console.log("[DARAZ_ORDER_SYNC_JOB]: Auto sync disabled.");
        return;
      }

      const accounts = await getDarazAccounts();
      if (!accounts.length) {
        console.log("[DARAZ_ORDER_SYNC_JOB]: No Daraz accounts found.");
        return;
      }

      const daysBack = Number(settings?.default_order_days_back || 7);
      const limit = Number(settings?.max_orders_per_sync || 100);

      for (const account of accounts) {
        try {
          await orderService.syncOrdersForAccount(account, {
            date_from: isoMinutesAgo(daysBack * 24 * 60),
            date_to: new Date().toISOString(),
            limit,
            sync_items: true,
            triggered_by: "system",
          });
        } catch (error) {
          console.error("[DARAZ_ORDER_SYNC_JOB_ACCOUNT_ERROR]:", account.account_code, error.message);
        }
      }
    } catch (error) {
      console.error("[DARAZ_ORDER_SYNC_JOB_ERROR]:", error.message);
    } finally {
      isRunning = false;
    }
  });

  console.log("[DARAZ_ORDER_SYNC_JOB]: Started. Runs every 10 minutes.");
}

module.exports = {
  startDarazOrderSyncJob,
};

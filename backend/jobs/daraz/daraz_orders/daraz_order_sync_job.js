const cron = require("node-cron");
const orderModel = require("../../../models/daraz/daraz_orders/daraz_order_model");
const orderService = require("../../../services/daraz/daraz_orders/daraz_order_service");
const accountModel = require("../../../models/marketplace/account_model");

let isRunning = false;
let historicalSyncCompleted = false;

const HISTORY_START_DATE = "2020-01-01T00:00:00.000Z";
const CHUNK_DAYS = 30;

async function getDarazAccounts() {
  if (typeof accountModel.getAllAccounts !== "function") return [];

  const accounts = await accountModel.getAllAccounts();

  return accounts.filter((account) => {
    const platform = String(account.platform_code || account.platform || "").toUpperCase();
    const status = String(account.status || account.active_status || "active").toLowerCase();

    return platform === "DARAZ" && status !== "inactive" && status !== "deleted";
  });
}

function isoMinutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isAutoSyncEnabled(settings) {
  if (!settings) return true;

  if (settings.auto_sync_enabled !== undefined && settings.auto_sync_enabled !== null) {
    return Number(settings.auto_sync_enabled) === 1;
  }

  if (settings.sync_enabled !== undefined && settings.sync_enabled !== null) {
    return Number(settings.sync_enabled) === 1;
  }

  return true;
}

function getDaysBack(settings) {
  const value = Number(settings?.default_order_days_back || 7);

  if (!Number.isFinite(value)) return 7;

  return Math.min(Math.max(value, 1), 30);
}

function getLimit(settings) {
  const value = Number(settings?.max_orders_per_sync || 100);

  if (!Number.isFinite(value)) return 100;

  return Math.min(Math.max(value, 1), 500);
}

async function syncAccountRange(account, dateFrom, dateTo, limit, triggeredBy) {
  return orderService.syncOrdersForAccount(account, {
    date_from: dateFrom,
    date_to: dateTo,
    limit,
    sync_items: true,
    triggered_by: triggeredBy,
  });
}

async function syncAccountHistory(account, limit) {
  let cursor = new Date(HISTORY_START_DATE);
  const now = new Date();

  while (cursor < now) {
    const chunkStart = new Date(cursor);
    const chunkEnd = addDays(chunkStart, CHUNK_DAYS);
    const finalEnd = chunkEnd > now ? now : chunkEnd;

    try {
      await syncAccountRange(
        account,
        chunkStart.toISOString(),
        finalEnd.toISOString(),
        limit,
        "history_2020"
      );

    } catch (error) {
      console.error(
        "[DARAZ_ORDER_SYNC_JOB_HISTORY_ERROR]:",
        account.account_code,
        chunkStart.toISOString(),
        finalEnd.toISOString(),
        error.message
      );
    }

    cursor = finalEnd;
  }
}

async function runDarazOrderSync() {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const settings = await orderModel.getSyncSettings();

    if (!isAutoSyncEnabled(settings)) {
      return;
    }

    const accounts = await getDarazAccounts();

    if (!accounts.length) {
      return;
    }

    const daysBack = getDaysBack(settings);
    const limit = getLimit(settings);

    if (!historicalSyncCompleted) {
      for (const account of accounts) {
        await syncAccountHistory(account, limit);
      }

      historicalSyncCompleted = true;
    }

    for (const account of accounts) {
      try {
        await syncAccountRange(
          account,
          isoMinutesAgo(daysBack * 24 * 60),
          new Date().toISOString(),
          limit,
          "system"
        );
      } catch (error) {
        console.error(
          "[DARAZ_ORDER_SYNC_JOB_ACCOUNT_ERROR]:",
          account.account_code,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("[DARAZ_ORDER_SYNC_JOB_ERROR]:", error.message);
  } finally {
    isRunning = false;
  }
}

function startDarazOrderSyncJob() {
  runDarazOrderSync();

  cron.schedule("*/10 * * * *", runDarazOrderSync);

}

module.exports = {
  startDarazOrderSyncJob,
};
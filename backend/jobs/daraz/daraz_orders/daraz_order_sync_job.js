const cron = require("node-cron");
const orderModel = require("../../../models/daraz/daraz_orders/daraz_order_model");
const orderService = require("../../../services/daraz/daraz_orders/daraz_order_service");
const accountModel = require("../../../models/marketplace/account_model");
const stockService = require("../../../services/inventory/marketplace_stock_service");
const { recordAutomationRun } = require("../../../services/system/automation_log_service");

let isRunning = false;
let historicalSyncCompleted = false;

const HISTORY_START_DATE = process.env.DARAZ_ORDER_HISTORY_START_DATE || "2020-01-01T00:00:00.000Z";
const CHUNK_DAYS = Number(process.env.DARAZ_ORDER_HISTORY_CHUNK_DAYS || 30);

async function getDarazAccounts() {
  if (typeof accountModel.getAllAccounts !== "function") return [];

  const accounts = await accountModel.getAllAccounts();

  return accounts.filter((account) => {
    const platform = String(account.platform_code || account.platform || "").toUpperCase();
    const status = String(account.status || account.active_status || "active").toLowerCase();
    const connection = String(account.connection_status || "connected").toLowerCase();

    return platform === "DARAZ" && status !== "inactive" && status !== "deleted" && connection !== "paused";
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
  const value = Number(settings?.default_order_days_back || process.env.DARAZ_ORDER_SYNC_DAYS_BACK || 7);
  if (!Number.isFinite(value)) return 7;
  return Math.min(Math.max(value, 1), 30);
}

function getLimit(settings) {
  const value = Number(settings?.max_orders_per_sync || process.env.DARAZ_ORDER_SYNC_LIMIT || 100);
  if (!Number.isFinite(value)) return 100;
  return Math.min(Math.max(value, 1), 500);
}

function getIntervalMinutes() {
  const value = Number(process.env.DARAZ_ORDER_SYNC_INTERVAL_MINUTES || 30);
  if (!Number.isFinite(value)) return 10;
  return Math.min(Math.max(value, 5), 60);
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
  const summary = { fetched: 0, inserted: 0, updated: 0, failed: 0 };

  while (cursor < now) {
    const chunkStart = new Date(cursor);
    const chunkEnd = addDays(chunkStart, CHUNK_DAYS);
    const finalEnd = chunkEnd > now ? now : chunkEnd;

    try {
      const result = await syncAccountRange(account, chunkStart.toISOString(), finalEnd.toISOString(), limit, "history_2020");
      summary.fetched += Number(result.total_fetched || 0);
      summary.inserted += Number(result.total_inserted || 0);
      summary.updated += Number(result.total_updated || 0);
      summary.failed += Number(result.total_failed || 0);
    } catch (_) {
      summary.failed += 1;
    }

    cursor = finalEnd;
  }

  return summary;
}

async function runDarazOrderSync() {
  if (isRunning) {
    return { skipped: true, reason: "previous_run_still_running" };
  }

  isRunning = true;
  const startedAt = new Date();
  const summary = { accounts: 0, success_accounts: 0, failed_accounts: 0, fetched: 0, inserted: 0, updated: 0, failed: 0 };

  try {
    const stockSettings = await stockService.getStockSettings();
    if (!stockSettings.daraz_auto_order_sync) {
      const skipped = { ...summary, skipped: true, reason: "daraz_auto_order_sync_disabled" };
      await recordAutomationRun({ jobName: "DARAZ_ORDER_SYNC", jobType: "order_sync", status: "skipped", summary: skipped, startedAt });
      return skipped;
    }

    const settings = await orderModel.getSyncSettings();

    if (!isAutoSyncEnabled(settings)) {
      const skipped = { ...summary, skipped: true, reason: "order_sync_settings_disabled" };
      await recordAutomationRun({ jobName: "DARAZ_ORDER_SYNC", jobType: "order_sync", status: "skipped", summary: skipped, startedAt });
      return skipped;
    }

    const accounts = await getDarazAccounts();
    summary.accounts = accounts.length;

    if (!accounts.length) {
      console.log("[DARAZ_ORDER_SYNC] Accounts: 0 | Saved: 0 | Failed: 0");
      await recordAutomationRun({ jobName: "DARAZ_ORDER_SYNC", jobType: "order_sync", status: "success", summary, startedAt });
      return summary;
    }

    const daysBack = getDaysBack(settings);
    const limit = getLimit(settings);

    if (String(process.env.DARAZ_ORDER_SYNC_HISTORY_ON_START || "false").toLowerCase() === "true" && !historicalSyncCompleted) {
      for (const account of accounts) {
        const result = await syncAccountHistory(account, limit);
        summary.fetched += result.fetched;
        summary.inserted += result.inserted;
        summary.updated += result.updated;
        summary.failed += result.failed;
      }
      historicalSyncCompleted = true;
    }

    for (const account of accounts) {
      try {
        const result = await syncAccountRange(account, isoMinutesAgo(daysBack * 24 * 60), new Date().toISOString(), limit, "system");
        summary.success_accounts += 1;
        summary.fetched += Number(result.total_fetched || 0);
        summary.inserted += Number(result.total_inserted || 0);
        summary.updated += Number(result.total_updated || 0);
        summary.failed += Number(result.total_failed || 0);
      } catch (_) {
        summary.failed_accounts += 1;
      }
    }

    console.log(`[DARAZ_ORDER_SYNC] Accounts: ${summary.accounts} | Inserted: ${summary.inserted} | Updated: ${summary.updated} | Failed: ${summary.failed + summary.failed_accounts}`);
    await recordAutomationRun({ jobName: "DARAZ_ORDER_SYNC", jobType: "order_sync", status: summary.failed || summary.failed_accounts ? "partial" : "success", summary, startedAt });
    return summary;
  } catch (error) {
    console.error("[DARAZ_ORDER_SYNC_ERROR]:", error.message);
    const failedSummary = { ...summary, error: error.message };
    await recordAutomationRun({ jobName: "DARAZ_ORDER_SYNC", jobType: "order_sync", status: "failed", summary: failedSummary, error, startedAt });
    return failedSummary;
  } finally {
    isRunning = false;
  }
}

function startDarazOrderSyncJob() {
  runDarazOrderSync();
  cron.schedule(`*/${getIntervalMinutes()} * * * *`, runDarazOrderSync, { timezone: "Asia/Colombo" });
  console.log(`[DARAZ_ORDER_SYNC] Scheduler started. Runs every ${getIntervalMinutes()} minutes.`);
}

module.exports = {
  startDarazOrderSyncJob,
  runDarazOrderSync,
};

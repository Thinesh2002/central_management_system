const cron = require('node-cron');
const wooModel = require('../../../models/marketplace/woo/woo_model');
const wooApi = require('../../../services/marketplace/woo/woo_api_service');
const wooOrderModel = require('../../../models/woo/woo_order_model');
const stockService = require('../../../services/inventory/marketplace_stock_service');
const { recordAutomationRun } = require('../../../services/system/automation_log_service');

let isRunning = false;

function minutesAgoIso(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function getIntervalMinutes() {
  const value = Number(process.env.WOO_ORDER_SYNC_INTERVAL_MINUTES || 30);
  return Number.isFinite(value) && value > 0 ? Math.max(value, 5) : 30;
}

function getDaysBack() {
  const value = Number(process.env.WOO_ORDER_SYNC_DAYS_BACK || 7);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 30) : 7;
}

async function syncWooOrdersForAccount(account) {
  const credentials = await wooModel.getWooCredentials(account.account_id || account.id);
  const result = await wooApi.getOrders(credentials, {
    page: 1,
    per_page: Number(process.env.WOO_ORDER_SYNC_PER_PAGE || 100),
    after: minutesAgoIso(getDaysBack() * 24 * 60),
    orderby: 'date',
    order: 'desc',
  });

  const orders = Array.isArray(result.data) ? result.data : [];
  let saved = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      await wooOrderModel.upsertOrder(credentials, order);
      saved += 1;
    } catch (error) {
      failed += 1;
    }
  }

  return { account_code: account.account_code, fetched: orders.length, saved, failed };
}

async function runWooOrderSync() {
  if (isRunning) return { skipped: true, reason: 'previous_run_still_running' };
  isRunning = true;
  const startedAt = new Date();

  const summary = { checked_accounts: 0, success_accounts: 0, failed_accounts: 0, fetched: 0, saved: 0, failed_orders: 0 };

  try {
    const settings = await stockService.getStockSettings();
    if (!settings.woo_auto_order_sync) {
      const skipped = { ...summary, skipped: true, reason: 'woo_auto_order_sync_disabled' };
      await recordAutomationRun({ jobName: 'WOO_ORDER_SYNC', jobType: 'order_sync', status: 'skipped', summary: skipped, startedAt });
      return skipped;
    }

    const accounts = await wooModel.listWooAccounts();
    const activeAccounts = accounts.filter((account) => {
      const status = String(account.status || 'active').toLowerCase();
      const connection = String(account.connection_status || account.health_connection_status || 'connected').toLowerCase();
      return status !== 'inactive' && status !== 'deleted' && connection !== 'paused';
    });

    summary.checked_accounts = activeAccounts.length;

    for (const account of activeAccounts) {
      try {
        const result = await syncWooOrdersForAccount(account);
        summary.success_accounts += 1;
        summary.fetched += result.fetched;
        summary.saved += result.saved;
        summary.failed_orders += result.failed;
      } catch (_) {
        summary.failed_accounts += 1;
      }
    }

    console.log(`[WOO_ORDER_SYNC] Accounts: ${summary.checked_accounts} | Saved: ${summary.saved} | Failed: ${summary.failed_accounts + summary.failed_orders}`);
    await recordAutomationRun({ jobName: 'WOO_ORDER_SYNC', jobType: 'order_sync', status: summary.failed_accounts || summary.failed_orders ? 'partial' : 'success', summary, startedAt });
    return summary;
  } catch (error) {
    console.error('[WOO_ORDER_SYNC_ERROR]:', error.message);
    const failedSummary = { ...summary, error: error.message };
    await recordAutomationRun({ jobName: 'WOO_ORDER_SYNC', jobType: 'order_sync', status: 'failed', summary: failedSummary, error, startedAt });
    return failedSummary;
  } finally {
    isRunning = false;
  }
}

function startWooOrderSyncJob() {
  runWooOrderSync();
  cron.schedule(`*/${getIntervalMinutes()} * * * *`, runWooOrderSync, { timezone: 'Asia/Colombo' });
  console.log(`[WOO_ORDER_SYNC] Scheduler started. Runs every ${getIntervalMinutes()} minutes.`);
}

module.exports = { startWooOrderSyncJob, runWooOrderSync, syncWooOrdersForAccount };

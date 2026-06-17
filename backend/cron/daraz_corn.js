const cron = require("node-cron");
const productSyncService = require("../services/daraz/daraz_product_sync_service");
const orderSyncService = require("../services/daraz/daraz_order_sync_service");
const categorySyncService = require("../services/daraz/daraz_category_sync_service");
const financeService = require("../services/daraz/daraz_finance_service");

const AUTO_SYNC_ENABLED = process.env.DARAZ_AUTO_SYNC_ENABLED !== "false";
const PRODUCT_SYNC_CRON = process.env.DARAZ_PRODUCT_SYNC_CRON || "*/30 * * * *";
const ORDER_SYNC_CRON = process.env.DARAZ_ORDER_SYNC_CRON || "*/30 * * * *";
const FINANCE_SYNC_CRON = process.env.DARAZ_FINANCE_SYNC_CRON || "*/30 * * * *";
const CATEGORY_SYNC_CRON = process.env.DARAZ_CATEGORY_SYNC_CRON || "15 2 * * *";

let productSyncRunning = false;
let orderSyncRunning = false;
let financeSyncRunning = false;
let categorySyncRunning = false;

const runSafely = async (jobName, runningFlagGetter, runningFlagSetter, callback) => {
  if (runningFlagGetter()) {
    console.log(`[${jobName}] Skipped because previous run is still active.`);
    return;
  }

  runningFlagSetter(true);
  const startedAt = new Date();
  console.log(`[${jobName}] Started at ${startedAt.toISOString()}`);

  try {
    const result = await callback();
    console.log(`[${jobName}] Completed at ${new Date().toISOString()}`, result?.summary || result || "");
  } catch (error) {
    console.error(`[${jobName}] Failed:`, error.message);
  } finally {
    runningFlagSetter(false);
  }
};

if (AUTO_SYNC_ENABLED) {
  cron.schedule(PRODUCT_SYNC_CRON, () =>
    runSafely(
      "DARAZ_PRODUCT_AUTO_SYNC_30_MIN",
      () => productSyncRunning,
      (value) => { productSyncRunning = value; },
      () => productSyncService.syncAllProducts({ force: false, syncType: "cron" })
    )
  );

  cron.schedule(ORDER_SYNC_CRON, () =>
    runSafely(
      "DARAZ_ORDER_AUTO_SYNC_30_MIN",
      () => orderSyncRunning,
      (value) => { orderSyncRunning = value; },
      () => orderSyncService.syncAllOrders({ syncType: "cron" })
    )
  );

  cron.schedule(FINANCE_SYNC_CRON, () =>
    runSafely(
      "DARAZ_FINANCE_AUTO_SYNC_30_MIN",
      () => financeSyncRunning,
      (value) => { financeSyncRunning = value; },
      () => financeService.syncFinance()
    )
  );

  cron.schedule(CATEGORY_SYNC_CRON, () =>
    runSafely(
      "DARAZ_CATEGORY_DAILY_SYNC",
      () => categorySyncRunning,
      (value) => { categorySyncRunning = value; },
      () => categorySyncService.syncCategoryTree()
    )
  );

  console.log(`[CRON_READY] Daraz product sync: ${PRODUCT_SYNC_CRON}`);
  console.log(`[CRON_READY] Daraz order sync: ${ORDER_SYNC_CRON}`);
  console.log(`[CRON_READY] Daraz finance sync: ${FINANCE_SYNC_CRON}`);
  console.log(`[CRON_READY] Daraz category sync: ${CATEGORY_SYNC_CRON}`);
} else {
  console.log("[CRON_DISABLED] DARAZ_AUTO_SYNC_ENABLED=false");
}

module.exports = {
  AUTO_SYNC_ENABLED,
  PRODUCT_SYNC_CRON,
  ORDER_SYNC_CRON,
  FINANCE_SYNC_CRON,
  CATEGORY_SYNC_CRON
};

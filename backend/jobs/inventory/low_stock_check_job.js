const cron = require("node-cron");

const inventoryDb = require("../../config/inventory_management_db/inventory_management_db");
const notificationModel = require("../../models/notifications/notification_model");

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SKUS_IN_MESSAGE = 5;

let running = false;

async function findLowStockRows() {
  const [rows] = await inventoryDb.query(
    `SELECT sku, available_qty, low_stock_alert_qty
     FROM product_inventory
     WHERE deleted_at IS NULL
       AND low_stock_alert_qty > 0
       AND available_qty <= low_stock_alert_qty
     ORDER BY available_qty ASC`
  );

  return rows;
}

async function checkLowStock() {
  if (running) {
    console.log("[LOW_STOCK_CHECK_JOB] Previous run still in progress. Skipped.");
    return;
  }

  running = true;

  try {
    const alreadyNotifiedToday = await notificationModel.existsRecentOfType(
      "low_stock",
      new Date(Date.now() - DAY_MS)
    );

    if (alreadyNotifiedToday) {
      console.log("[LOW_STOCK_CHECK_JOB] Already sent a low-stock notification in the last 24h. Skipped.");
      return;
    }

    const lowStockRows = await findLowStockRows();

    if (!lowStockRows.length) {
      console.log("[LOW_STOCK_CHECK_JOB] No low-stock items found.");
      return;
    }

    const previewSkus = lowStockRows.slice(0, MAX_SKUS_IN_MESSAGE).map((row) => row.sku).join(", ");
    const remaining = lowStockRows.length - MAX_SKUS_IN_MESSAGE;

    await notificationModel.create({
      type: "low_stock",
      severity: "warning",
      title: `${lowStockRows.length} product(s) low on stock`,
      message: remaining > 0 ? `${previewSkus} and ${remaining} more.` : previewSkus,
      link: "/inventory",
    });

    console.log(`[LOW_STOCK_CHECK_JOB] Notified: ${lowStockRows.length} low-stock item(s).`);
  } catch (error) {
    console.error("[LOW_STOCK_CHECK_JOB] Job failed:", error.message);
  } finally {
    running = false;
  }
}

function startLowStockCheckJob() {
  cron.schedule("0 7 * * *", checkLowStock, { timezone: "Asia/Colombo" });
  console.log("[LOW_STOCK_CHECK_JOB] Scheduler started. Daily low-stock check at 07:00 Colombo.");
}

module.exports = { startLowStockCheckJob, checkLowStock };

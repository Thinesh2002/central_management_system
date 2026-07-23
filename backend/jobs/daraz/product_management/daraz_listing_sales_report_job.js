const cron = require("node-cron");

const notificationModel = require("../../../models/notifications/notification_model");
const { writeSystemLog } = require("../../../utils/logger");
const { runListingSalesReport, REPORT_WINDOW_DAYS } = require("../../../services/daraz/product_management/daraz_listing_sales_report_service");

const DAY_MS = 24 * 60 * 60 * 1000;
const NOTIFICATION_TYPE = "listing_sales_report";

let running = false;

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildNotificationMessage(result) {
  const { totals, window_days: windowDays } = result;

  return (
    `Sales in the last ${windowDays} days: LKR ${formatMoney(totals.sales)}, fees LKR ${formatMoney(totals.expenses)}, net LKR ${formatMoney(totals.net)}. ` +
    `${totals.sold_count} sold / ${totals.unsold_count} unsold listings (${totals.titles_regenerated} title(s) refreshed for unsold).`
  );
}

function buildLogMessage(result) {
  const lines = [
    `Daily listing & sales report - trailing ${result.window_days} days (${result.date_from} to ${result.date_to}):`,
    `Total: ${result.totals.total_listings} listings, ${result.totals.sold_count} sold, ${result.totals.unsold_count} unsold, ${result.totals.titles_regenerated} title(s) regenerated.`,
    `Sales (last ${result.window_days} days) LKR ${formatMoney(result.totals.sales)}, Expenses LKR ${formatMoney(result.totals.expenses)}, Net LKR ${formatMoney(result.totals.net)}.`,
  ];

  result.accounts.forEach((r) => {
    if (r.error) {
      lines.push(`- ${r.account_name || r.account_id}: FAILED - ${r.error}`);
      return;
    }

    lines.push(
      `- ${r.account_name}: ${r.sold_count}/${r.total_listings} sold, ${r.titles_regenerated} title(s) regenerated` +
        (r.titles_failed ? ` (${r.titles_failed} failed)` : "") +
        `, sales LKR ${formatMoney(r.sales)}, expenses LKR ${formatMoney(r.expenses)}` +
        (r.has_payout_data ? "" : " (no Daraz payout statement in this window yet)")
    );
  });

  return lines.join("\n");
}

async function runListingSalesReportJob() {
  if (running) {
    console.log("[DARAZ_LISTING_SALES_REPORT_JOB] Previous run still in progress. Skipped.");
    return;
  }

  running = true;

  try {
    // Runs every day - only guards against firing twice on the same day
    // (e.g. a manual restart shortly after the scheduled run), unlike the
    // old bi-weekly gate which used to skip 13 out of every 14 days.
    const alreadyRanToday = await notificationModel.existsRecentOfType(
      NOTIFICATION_TYPE,
      new Date(Date.now() - DAY_MS)
    );

    if (alreadyRanToday) {
      return;
    }

    console.log("[DARAZ_LISTING_SALES_REPORT_JOB] Running daily listing & sales report...");

    const result = await runListingSalesReport();

    await notificationModel.create({
      type: NOTIFICATION_TYPE,
      severity: "info",
      title: "Daily listing & sales report",
      message: buildNotificationMessage(result),
      link: "/product/daraz-products/title-optimizer",
    });

    await writeSystemLog({
      action: "DARAZ_LISTING_SALES_REPORT",
      module: "daraz",
      status: "success",
      message: buildLogMessage(result),
    });

    console.log(
      `[DARAZ_LISTING_SALES_REPORT_JOB] Done. ${result.totals.sold_count} sold / ${result.totals.unsold_count} unsold, ${result.totals.titles_regenerated} title(s) regenerated.`
    );
  } catch (error) {
    console.error("[DARAZ_LISTING_SALES_REPORT_JOB] Job failed:", error.message);

    await writeSystemLog({
      action: "DARAZ_LISTING_SALES_REPORT",
      module: "daraz",
      status: "failed",
      message: error.message,
    }).catch(() => {});
  } finally {
    running = false;
  }
}

function startDarazListingSalesReportJob() {
  // Runs every day at 06:00 Colombo. Each run recomputes sold/unsold and
  // sales/expenses over a fresh trailing REPORT_WINDOW_DAYS window (see
  // daraz_listing_sales_report_service.js), so the figures always reflect
  // "last 14 days as of today" rather than a fixed 14-day cycle.
  cron.schedule("0 6 * * *", runListingSalesReportJob, { timezone: "Asia/Colombo" });
  console.log(
    `[DARAZ_LISTING_SALES_REPORT_JOB] Scheduler started. Runs daily at 06:00 Colombo, reporting a trailing ${REPORT_WINDOW_DAYS}-day window.`
  );
}

module.exports = { startDarazListingSalesReportJob, runListingSalesReportJob };

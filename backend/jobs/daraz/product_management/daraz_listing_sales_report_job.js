const cron = require("node-cron");

const notificationModel = require("../../../models/notifications/notification_model");
const { writeSystemLog } = require("../../../utils/logger");
const { runBiweeklyListingReport, REPORT_WINDOW_DAYS } = require("../../../services/daraz/product_management/daraz_biweekly_report_service");

const DAY_MS = 24 * 60 * 60 * 1000;
const NOTIFICATION_TYPE = "biweekly_listing_report";

let running = false;

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildNotificationMessage(result) {
  const { totals, window_days: windowDays } = result;

  return (
    `Last ${windowDays} days: ${totals.sold_count} sold / ${totals.unsold_count} unsold listings ` +
    `(${totals.titles_regenerated} title(s) refreshed for unsold). ` +
    `Sales LKR ${formatMoney(totals.sales)}, fees LKR ${formatMoney(totals.expenses)}, net LKR ${formatMoney(totals.net)}.`
  );
}

function buildLogMessage(result) {
  const lines = [
    `Bi-weekly listing report (${result.date_from} to ${result.date_to}):`,
    `Total: ${result.totals.total_listings} listings, ${result.totals.sold_count} sold, ${result.totals.unsold_count} unsold, ${result.totals.titles_regenerated} title(s) regenerated.`,
    `Sales LKR ${formatMoney(result.totals.sales)}, Expenses LKR ${formatMoney(result.totals.expenses)}, Net LKR ${formatMoney(result.totals.net)}.`,
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

async function runBiweeklyReportJob() {
  if (running) {
    console.log("[DARAZ_BIWEEKLY_REPORT_JOB] Previous run still in progress. Skipped.");
    return;
  }

  running = true;

  try {
    const alreadyRanThisPeriod = await notificationModel.existsRecentOfType(
      NOTIFICATION_TYPE,
      new Date(Date.now() - REPORT_WINDOW_DAYS * DAY_MS)
    );

    if (alreadyRanThisPeriod) {
      return;
    }

    console.log("[DARAZ_BIWEEKLY_REPORT_JOB] Running bi-weekly listing report...");

    const result = await runBiweeklyListingReport();

    await notificationModel.create({
      type: NOTIFICATION_TYPE,
      severity: "info",
      title: "Bi-weekly listing & sales report",
      message: buildNotificationMessage(result),
      link: "/product/daraz-products/title-optimizer",
    });

    await writeSystemLog({
      action: "DARAZ_BIWEEKLY_LISTING_REPORT",
      module: "daraz",
      status: "success",
      message: buildLogMessage(result),
    });

    console.log(
      `[DARAZ_BIWEEKLY_REPORT_JOB] Done. ${result.totals.sold_count} sold / ${result.totals.unsold_count} unsold, ${result.totals.titles_regenerated} title(s) regenerated.`
    );
  } catch (error) {
    console.error("[DARAZ_BIWEEKLY_REPORT_JOB] Job failed:", error.message);

    await writeSystemLog({
      action: "DARAZ_BIWEEKLY_LISTING_REPORT",
      module: "daraz",
      status: "failed",
      message: error.message,
    }).catch(() => {});
  } finally {
    running = false;
  }
}

function startDarazBiweeklyReportJob() {
  // Checked daily at 06:00 Colombo, but only actually runs once every
  // REPORT_WINDOW_DAYS (guarded via notificationModel.existsRecentOfType,
  // same pattern low_stock_check_job.js uses for its own 24h guard) - this
  // gives a genuine 14-day cadence without a separate "last run" table,
  // and self-heals if the server was down on the exact day it was due.
  cron.schedule("0 6 * * *", runBiweeklyReportJob, { timezone: "Asia/Colombo" });
  console.log(
    `[DARAZ_BIWEEKLY_REPORT_JOB] Scheduler started. Checks daily at 06:00 Colombo, runs every ${REPORT_WINDOW_DAYS} days.`
  );
}

module.exports = { startDarazBiweeklyReportJob, runBiweeklyReportJob };

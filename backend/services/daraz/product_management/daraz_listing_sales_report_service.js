const accountModel = require("../../../models/marketplace/account_model");
const darazProductSyncModel = require("../../../models/daraz/product_management/daraz_product_sync_model");
const darazSalesLookupModel = require("../../../models/daraz/product_management/daraz_sales_lookup_model");
const darazFinancePayoutModel = require("../../../models/daraz/finance_management/daraz_finance_payout_model");
const titleScanService = require("./daraz_title_scan_service");

const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_WINDOW_DAYS = 14;
const TITLE_REGEN_LIMIT_PER_ACCOUNT = 50;

function money(value) {
  return Number(value || 0);
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

// One account's slice of the report: how many active listings sold vs
// didn't in the window, how many got a fresh AI title because of it, and
// what that account actually made/paid Daraz in the same window.
async function buildAccountReport(account, sinceDate, dateFromStr, dateToStr) {
  const [listings, recentlySoldSkus, payoutSummary] = await Promise.all([
    darazProductSyncModel.listPreview({ account_id: account.id, limit: 5000, offset: 0 }),
    darazSalesLookupModel.getRecentlySoldSkus({ accountName: account.account_name, sinceDate }),
    darazFinancePayoutModel.getPayoutSummary({
      account_id: account.id,
      date_from: dateFromStr,
      date_to: dateToStr,
    }),
  ]);

  const activeListings = listings.filter((item) => String(item.status || "").toLowerCase() === "active");
  const soldCount = activeListings.filter((item) => item.seller_sku && recentlySoldSkus.has(item.seller_sku)).length;
  const unsoldCount = activeListings.length - soldCount;

  // Reuses the exact same "no sales in N days" title-regeneration path the
  // daily stale-listing job already uses, just parameterized to this
  // report's 14-day window instead of the daily job's 30.
  const titleScan = await titleScanService.scanAccountForTitleSuggestions({
    accountId: account.id,
    limit: TITLE_REGEN_LIMIT_PER_ACCOUNT,
    mode: "stale",
    staleDays: REPORT_WINDOW_DAYS,
  });

  const sales = money(payoutSummary.total_item_revenue) + money(payoutSummary.total_other_revenue);
  const expenses =
    money(payoutSummary.total_fees) + money(payoutSummary.total_fees_on_refunds) + money(payoutSummary.total_refunds);

  return {
    account_id: account.id,
    account_name: account.account_name,
    total_listings: activeListings.length,
    sold_count: soldCount,
    unsold_count: unsoldCount,
    titles_regenerated: titleScan.succeeded,
    titles_failed: titleScan.failed,
    sales,
    expenses,
    net: sales - expenses,
    has_payout_data: Number(payoutSummary.total_statements) > 0,
  };
}

async function runListingSalesReport() {
  const accounts = await accountModel.listActiveDarazAccounts();

  const sinceDate = new Date(Date.now() - REPORT_WINDOW_DAYS * DAY_MS);
  const dateFromStr = toDateOnly(sinceDate);
  const dateToStr = toDateOnly(new Date());

  const accountReports = [];

  for (const account of accounts) {
    try {
      const report = await buildAccountReport(account, sinceDate, dateFromStr, dateToStr);
      accountReports.push(report);
    } catch (error) {
      console.error(`[DARAZ_LISTING_SALES_REPORT] Failed for account ${account.id}:`, error.message);
      accountReports.push({
        account_id: account.id,
        account_name: account.account_name,
        error: error.message,
      });
    }
  }

  const totals = accountReports.reduce(
    (sum, r) => {
      if (r.error) return sum;
      sum.total_listings += r.total_listings;
      sum.sold_count += r.sold_count;
      sum.unsold_count += r.unsold_count;
      sum.titles_regenerated += r.titles_regenerated;
      sum.sales += r.sales;
      sum.expenses += r.expenses;
      return sum;
    },
    { total_listings: 0, sold_count: 0, unsold_count: 0, titles_regenerated: 0, sales: 0, expenses: 0 }
  );
  totals.net = totals.sales - totals.expenses;

  return {
    window_days: REPORT_WINDOW_DAYS,
    date_from: dateFromStr,
    date_to: dateToStr,
    accounts: accountReports,
    totals,
  };
}

module.exports = { runListingSalesReport, REPORT_WINDOW_DAYS };

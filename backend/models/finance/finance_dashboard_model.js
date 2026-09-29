const financeDb = require("../../config/finance_management_db/finance_management_db");
const orderDb = require("../../config/order_management_db/order_management_db");

// Same exclusion rule as order_model's isCountableStatus - cancelled and
// returned orders never count toward revenue.
const EXCLUDED_ORDER_STATUSES = ["cancelled", "canceled", "returned", "shipped_back_success"];

// Buyer-income lines mirror revenue already counted from the order tables.
// They are not marketplace costs. Every other finance line (fees, penalties,
// promotions, claims and reversals) nets into marketplace fees.
const BUYER_INCOME_CONDITION = `(fee_type IN ('13', '8')
  OR LOWER(COALESCE(fee_name, '')) LIKE '%product price%'
  OR LOWER(COALESCE(fee_name, '')) LIKE '%item price%'
  OR LOWER(COALESCE(fee_name, '')) LIKE '%shipping fee paid by buyer%')`;

const ORDER_SOURCES = [
  { source: "daraz", label: "Daraz", table: "daraz_orders" },
  { source: "local", label: "Manual", table: "orders" },
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function parseMoney(value) {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function periodFormat(granularity) {
  return granularity === "month" ? "%Y-%m" : "%Y-%m-%d";
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000) + 1;
}

// Every day (or month) in range, so the series has no gaps where nothing
// happened - a missing day must plot as 0, not be skipped.
function listPeriods(from, to, granularity) {
  const periods = [];
  if (granularity === "month") {
    let cursor = `${from.slice(0, 7)}-01`;
    while (cursor.slice(0, 7) <= to.slice(0, 7)) {
      periods.push(cursor.slice(0, 7));
      const date = new Date(`${cursor}T00:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() + 1);
      cursor = date.toISOString().slice(0, 10);
    }
    return periods;
  }

  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) periods.push(cursor);
  return periods;
}

// ---------------------------------------------------------------------
// Orders (cm_order_management)
// ---------------------------------------------------------------------

function orderStatusCondition() {
  return `LOWER(COALESCE(order_status, '')) NOT IN (${EXCLUDED_ORDER_STATUSES.map(() => "?").join(",")})`;
}

async function getOrderRevenueByPeriod(from, to, granularity) {
  const results = await Promise.all(
    ORDER_SOURCES.map(async ({ source, table }) => {
      const [rows] = await orderDb.query(
        `SELECT DATE_FORMAT(order_date, ?) AS period,
                COALESCE(SUM(grand_total), 0) AS revenue,
                COUNT(*) AS orders
         FROM \`${table}\`
         WHERE order_date >= ? AND order_date <= ? AND ${orderStatusCondition()}
         GROUP BY period`,
        [periodFormat(granularity), from, `${to} 23:59:59`, ...EXCLUDED_ORDER_STATUSES]
      );
      return rows.map((row) => ({ ...row, source }));
    })
  );
  return results.flat();
}

async function getOrderRevenueByChannel(from, to) {
  const results = await Promise.all(
    ORDER_SOURCES.map(async ({ source, label, table }) => {
      const [rows] = await orderDb.query(
        `SELECT COALESCE(NULLIF(account_name, ''), ?) AS channel_name,
                COALESCE(SUM(grand_total), 0) AS revenue,
                COUNT(*) AS orders
         FROM \`${table}\`
         WHERE order_date >= ? AND order_date <= ? AND ${orderStatusCondition()}
         GROUP BY channel_name`,
        [label, from, `${to} 23:59:59`, ...EXCLUDED_ORDER_STATUSES]
      );
      return rows.map((row) => ({
        channel: row.channel_name === label ? label : `${label} · ${row.channel_name}`,
        source,
        revenue: round2(row.revenue),
        orders: Number(row.orders || 0),
      }));
    })
  );

  return results
    .flat()
    .filter((row) => row.revenue > 0 || row.orders > 0)
    .sort((a, b) => b.revenue - a.revenue);
}

// ---------------------------------------------------------------------
// Daraz settlements (cm_finance_management)
// ---------------------------------------------------------------------

async function getMarketplaceFeesByPeriod(from, to, granularity) {
  const [rows] = await financeDb.query(
    `SELECT DATE_FORMAT(transaction_date_parsed, ?) AS period,
            COALESCE(-SUM(amount), 0) AS fees
     FROM daraz_finance_transactions
     WHERE transaction_date_parsed >= ? AND transaction_date_parsed <= ?
       AND NOT (${BUYER_INCOME_CONDITION})
     GROUP BY period`,
    [periodFormat(granularity), from, to]
  );
  return rows;
}

async function getFeeBreakdown(from, to) {
  const [rows] = await financeDb.query(
    `SELECT COALESCE(NULLIF(fee_name, ''), NULLIF(transaction_type, ''), 'Other') AS fee_label,
            COALESCE(-SUM(amount), 0) AS net_fee,
            COUNT(*) AS line_count
     FROM daraz_finance_transactions
     WHERE transaction_date_parsed >= ? AND transaction_date_parsed <= ?
       AND NOT (${BUYER_INCOME_CONDITION})
     GROUP BY fee_label
     HAVING net_fee > 0
     ORDER BY net_fee DESC`,
    [from, to]
  );

  const items = rows.map((row) => ({ name: row.fee_label, amount: round2(row.net_fee), lines: Number(row.line_count) }));
  const top = items.slice(0, 7);
  const rest = items.slice(7);
  if (rest.length) {
    top.push({
      name: `Other (${rest.length})`,
      amount: round2(rest.reduce((sum, item) => sum + item.amount, 0)),
      lines: rest.reduce((sum, item) => sum + item.lines, 0),
    });
  }
  return top;
}

async function getPayoutSnapshot(from, to, accountNames) {
  const [[paidRow]] = await financeDb.query(
    `SELECT
       COALESCE(SUM(CASE WHEN paid = 1 THEN
         CAST(REPLACE(REPLACE(payout, 'LKR', ''), ',', '') AS DECIMAL(14,2))
       ELSE 0 END), 0) AS paid,
       COALESCE(SUM(paid = 1), 0) AS statements,
       COUNT(*) AS total_statements
     FROM daraz_finance_payouts
     WHERE DATE(daraz_created_at) >= ? AND DATE(daraz_created_at) <= ?`,
    [from, to]
  );

  // Balances are point-in-time: take each account's latest statement
  // (regardless of the selected range) and add those up.
  const [balanceRows] = await financeDb.query(
    `SELECT p.account_id, p.closing_balance, p.statement_number, p.daraz_created_at
     FROM daraz_finance_payouts p
     INNER JOIN (
       SELECT account_id, MAX(daraz_created_at) AS latest
       FROM daraz_finance_payouts
       GROUP BY account_id
     ) l ON l.account_id = p.account_id AND l.latest = p.daraz_created_at`
  );

  const seen = new Set();
  const balances = balanceRows
    .filter((row) => (seen.has(row.account_id) ? false : seen.add(row.account_id)))
    .map((row) => ({
      account_id: row.account_id,
      account_name: accountNames.get(Number(row.account_id)) || `Account #${row.account_id}`,
      closing_balance: round2(row.closing_balance),
      statement_number: row.statement_number,
      statement_date: row.daraz_created_at,
    }));

  const [recentRows] = await financeDb.query(
    `SELECT account_id, statement_number, paid, payout, item_revenue, fees_total, refunds,
            closing_balance, daraz_created_at
     FROM daraz_finance_payouts
     WHERE DATE(daraz_created_at) >= ? AND DATE(daraz_created_at) <= ?
     ORDER BY daraz_created_at DESC, id DESC
     LIMIT 8`,
    [from, to]
  );

  return {
    paid: round2(paidRow.paid),
    statements: Number(paidRow.statements || 0),
    total_statements: Number(paidRow.total_statements || 0),
    balances,
    total_balance: round2(balances.reduce((sum, row) => sum + row.closing_balance, 0)),
    recent: recentRows.map((row) => ({
      ...row,
      account_name: accountNames.get(Number(row.account_id)) || `Account #${row.account_id}`,
      paid: round2(row.paid),
      payout: round2(parseMoney(row.payout)),
      item_revenue: round2(row.item_revenue),
      fees_total: round2(row.fees_total),
      refunds: round2(row.refunds),
      closing_balance: round2(row.closing_balance),
    })),
  };
}

// ---------------------------------------------------------------------
// Ledger (cm_finance_management)
// ---------------------------------------------------------------------

async function getLedgerByPeriod(from, to, granularity) {
  const [rows] = await financeDb.query(
    `SELECT DATE_FORMAT(entry_date, ?) AS period,
            COALESCE(SUM(CASE WHEN entry_type = 'income' THEN amount ELSE 0 END), 0) AS income,
            COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0) AS expense
     FROM finance_entries
     WHERE deleted_at IS NULL AND entry_date >= ? AND entry_date <= ?
     GROUP BY period`,
    [periodFormat(granularity), from, to]
  );
  return rows;
}

async function getLedgerByCategory(from, to, entryType) {
  const [rows] = await financeDb.query(
    `SELECT COALESCE(c.name, 'Uncategorised') AS category_label, COALESCE(SUM(e.amount), 0) AS total_amount, COUNT(*) AS entries
     FROM finance_entries e
     LEFT JOIN finance_categories c ON c.id = e.category_id
     WHERE e.deleted_at IS NULL AND e.entry_type = ? AND e.entry_date >= ? AND e.entry_date <= ?
     GROUP BY category_label
     ORDER BY total_amount DESC`,
    [entryType, from, to]
  );

  const items = rows.map((row) => ({ name: row.category_label, amount: round2(row.total_amount), entries: Number(row.entries) }));
  const top = items.slice(0, 7);
  const rest = items.slice(7);
  if (rest.length) {
    top.push({
      name: `Other (${rest.length})`,
      amount: round2(rest.reduce((sum, item) => sum + item.amount, 0)),
      entries: rest.reduce((sum, item) => sum + item.entries, 0),
    });
  }
  return top;
}

async function getRecentEntries(limit = 8) {
  const [rows] = await financeDb.query(
    `SELECT e.id, e.entry_type, DATE_FORMAT(e.entry_date, '%Y-%m-%d') AS entry_date, e.amount,
            e.description, e.reference, c.name AS category_name
     FROM finance_entries e
     LEFT JOIN finance_categories c ON c.id = e.category_id
     WHERE e.deleted_at IS NULL
     ORDER BY e.entry_date DESC, e.id DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((row) => ({ ...row, amount: round2(row.amount) }));
}

// ---------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------

async function getPeriodTotals(from, to) {
  const granularity = "month";
  const [orders, fees, ledger] = await Promise.all([
    getOrderRevenueByPeriod(from, to, granularity),
    getMarketplaceFeesByPeriod(from, to, granularity),
    getLedgerByPeriod(from, to, granularity),
  ]);

  const sum = (rows, key, predicate = () => true) =>
    rows.filter(predicate).reduce((total, row) => total + toNumber(row[key]), 0);

  const totals = {
    order_revenue: sum(orders, "revenue"),
    daraz_revenue: sum(orders, "revenue", (row) => row.source === "daraz"),
    manual_revenue: sum(orders, "revenue", (row) => row.source === "local"),
    order_count: sum(orders, "orders"),
    marketplace_fees: sum(fees, "fees"),
    other_income: sum(ledger, "income"),
    expenses: sum(ledger, "expense"),
  };

  totals.net_profit =
    totals.order_revenue - totals.marketplace_fees + totals.other_income - totals.expenses;

  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, key === "order_count" ? value : round2(value)])
  );
}

async function getDashboard({ from, to, accountNames }) {
  const days = daysBetween(from, to);
  const granularity = days > 62 ? "month" : "day";
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(previousTo, -(days - 1));

  const [
    totals,
    previousTotals,
    orderSeries,
    feeSeries,
    ledgerSeries,
    channels,
    feeBreakdown,
    expenseBreakdown,
    incomeBreakdown,
    payouts,
    recentEntries,
  ] = await Promise.all([
    getPeriodTotals(from, to),
    getPeriodTotals(previousFrom, previousTo),
    getOrderRevenueByPeriod(from, to, granularity),
    getMarketplaceFeesByPeriod(from, to, granularity),
    getLedgerByPeriod(from, to, granularity),
    getOrderRevenueByChannel(from, to),
    getFeeBreakdown(from, to),
    getLedgerByCategory(from, to, "expense"),
    getLedgerByCategory(from, to, "income"),
    getPayoutSnapshot(from, to, accountNames),
    getRecentEntries(8),
  ]);

  const byPeriod = new Map(
    listPeriods(from, to, granularity).map((period) => [
      period,
      { period, revenue: 0, orders: 0, marketplace_fees: 0, other_income: 0, expenses: 0 },
    ])
  );

  orderSeries.forEach((row) => {
    const bucket = byPeriod.get(row.period);
    if (!bucket) return;
    bucket.revenue += toNumber(row.revenue);
    bucket.orders += Number(row.orders || 0);
  });
  feeSeries.forEach((row) => {
    const bucket = byPeriod.get(row.period);
    if (bucket) bucket.marketplace_fees += toNumber(row.fees);
  });
  ledgerSeries.forEach((row) => {
    const bucket = byPeriod.get(row.period);
    if (!bucket) return;
    bucket.other_income += toNumber(row.income);
    bucket.expenses += toNumber(row.expense);
  });

  const series = [...byPeriod.values()].map((row) => {
    const income = row.revenue + row.other_income;
    const costs = row.marketplace_fees + row.expenses;
    return {
      period: row.period,
      orders: row.orders,
      revenue: round2(row.revenue),
      marketplace_fees: round2(row.marketplace_fees),
      other_income: round2(row.other_income),
      expenses: round2(row.expenses),
      income: round2(income),
      costs: round2(costs),
      net: round2(income - costs),
    };
  });

  return {
    range: { from, to, days, granularity, previous_from: previousFrom, previous_to: previousTo },
    totals,
    previous_totals: previousTotals,
    series,
    channels,
    fee_breakdown: feeBreakdown,
    expense_breakdown: expenseBreakdown,
    income_breakdown: incomeBreakdown,
    payouts,
    recent_entries: recentEntries,
  };
}

module.exports = { getDashboard };

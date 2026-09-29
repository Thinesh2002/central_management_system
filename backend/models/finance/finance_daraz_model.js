const db = require("../../config/finance_management_db/finance_management_db");
const { CATEGORIES, categorySql, parseAmount } = require("./daraz_fee_categories");

const CATEGORY_SQL = categorySql();
const PAID_SQL = "LOWER(COALESCE(paid_status, '')) IN ('paid', 'yes', '1', 'true')";

function round2(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function buildLineFilters({ from, to, account_id } = {}) {
  const where = ["1=1"];
  const params = [];
  if (from) {
    where.push("transaction_date_parsed >= ?");
    params.push(from);
  }
  if (to) {
    where.push("transaction_date_parsed <= ?");
    params.push(to);
  }
  if (account_id) {
    where.push("account_id = ?");
    params.push(Number(account_id));
  }
  return { where, params };
}

// SUM(CASE category ...) per bucket, as SELECT columns named cat_<key>.
const CATEGORY_COLUMNS = CATEGORIES.map(
  ({ key }) => `COALESCE(SUM(CASE WHEN ${CATEGORY_SQL} = '${key}' THEN amount ELSE 0 END), 0) AS cat_${key}`
).join(",\n       ");

function pickCategories(row) {
  const out = {};
  CATEGORIES.forEach(({ key }) => {
    out[key] = round2(row[`cat_${key}`]);
  });
  return out;
}

function withIncomeSplit(categories, net) {
  const income = CATEGORIES.filter((c) => c.income).reduce((sum, c) => sum + categories[c.key], 0);
  return {
    categories,
    income: round2(income),
    deductions: round2(net - income),
    net: round2(net),
  };
}

async function getSummary(filters = {}) {
  const { where, params } = buildLineFilters(filters);
  const [[row]] = await db.query(
    `SELECT ${CATEGORY_COLUMNS},
       COALESCE(SUM(amount), 0) AS net,
       COUNT(*) AS line_count,
       COUNT(DISTINCT NULLIF(order_no, '')) AS order_count,
       COALESCE(SUM(CASE WHEN ${PAID_SQL} THEN amount ELSE 0 END), 0) AS paid_amount,
       COALESCE(SUM(CASE WHEN NOT (${PAID_SQL}) THEN amount ELSE 0 END), 0) AS unpaid_amount,
       COALESCE(SUM(vat_in_amount), 0) AS vat_total,
       COALESCE(SUM(wht_amount), 0) AS wht_total
     FROM daraz_finance_transactions
     WHERE ${where.join(" AND ")}`,
    params
  );

  return {
    ...withIncomeSplit(pickCategories(row), Number(row.net)),
    line_count: Number(row.line_count),
    order_count: Number(row.order_count),
    paid_amount: round2(row.paid_amount),
    unpaid_amount: round2(row.unpaid_amount),
    vat_total: round2(row.vat_total),
    wht_total: round2(row.wht_total),
  };
}

// One row per order: every fee bucket side by side, so each order shows
// exactly what the buyer paid, what Daraz deducted, and what was received.
async function listOrders({ from, to, account_id, search, paid, limit = 50, offset = 0 } = {}) {
  const { where, params } = buildLineFilters({ from, to, account_id });
  where.push("order_no IS NOT NULL AND order_no <> ''");

  const term = String(search || "").trim();
  if (term) {
    // Match the order through any of its lines, but keep all of its lines in
    // the totals (filtering lines directly would drop the other fees).
    where.push(`order_no IN (
      SELECT order_no FROM (
        SELECT DISTINCT order_no FROM daraz_finance_transactions
        WHERE order_no LIKE ? OR seller_sku LIKE ? OR details LIKE ?
      ) matched)`);
    const like = `%${term}%`;
    params.push(like, like, like);
  }

  const having = [];
  if (paid === "paid") having.push(`SUM(${PAID_SQL}) = COUNT(*)`);
  if (paid === "unpaid") having.push(`SUM(${PAID_SQL}) < COUNT(*)`);
  const havingSql = having.length ? `HAVING ${having.join(" AND ")}` : "";

  const groupedSql = `
    SELECT account_id, order_no,
       ${CATEGORY_COLUMNS},
       COALESCE(SUM(amount), 0) AS net,
       COUNT(*) AS line_count,
       COUNT(DISTINCT NULLIF(order_item_no, '')) AS item_count,
       MIN(transaction_date_parsed) AS first_date,
       MAX(transaction_date_parsed) AS last_date,
       MAX(details) AS product_title,
       GROUP_CONCAT(DISTINCT NULLIF(seller_sku, '') SEPARATOR ', ') AS seller_skus,
       GROUP_CONCAT(DISTINCT NULLIF(order_item_status, '') SEPARATOR ', ') AS item_statuses,
       GROUP_CONCAT(DISTINCT NULLIF(statement, '') SEPARATOR ', ') AS statements,
       SUM(${PAID_SQL}) AS paid_lines
    FROM daraz_finance_transactions
    WHERE ${where.join(" AND ")}
    GROUP BY account_id, order_no
    ${havingSql}`;

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const [rows] = await db.query(
    `${groupedSql} ORDER BY last_date DESC, order_no DESC LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset]
  );

  const totalColumns = CATEGORIES.map(({ key }) => `COALESCE(SUM(cat_${key}), 0) AS cat_${key}`).join(", ");
  const [[totals]] = await db.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(net), 0) AS net, ${totalColumns} FROM (${groupedSql}) g`,
    params
  );

  return {
    rows: rows.map((row) => ({
      account_id: row.account_id,
      order_no: row.order_no,
      first_date: row.first_date,
      last_date: row.last_date,
      product_title: row.product_title,
      seller_skus: row.seller_skus,
      item_statuses: row.item_statuses,
      statements: row.statements,
      item_count: Number(row.item_count),
      line_count: Number(row.line_count),
      paid_status:
        Number(row.paid_lines) === Number(row.line_count) ? "Paid" : Number(row.paid_lines) > 0 ? "Partly paid" : "Not paid",
      ...withIncomeSplit(pickCategories(row), Number(row.net)),
    })),
    total: Number(totals.total),
    totals: withIncomeSplit(pickCategories(totals), Number(totals.net)),
  };
}

async function getOrderLines(accountId, orderNo) {
  const [rows] = await db.query(
    `SELECT id, transaction_number, order_item_no, fee_type, fee_name, transaction_type,
            ${CATEGORY_SQL} AS category, amount, vat_in_amount, wht_amount, paid_status,
            DATE_FORMAT(transaction_date_parsed, '%Y-%m-%d') AS transaction_date, statement,
            seller_sku, details, order_item_status, shipping_provider, comment
     FROM daraz_finance_transactions
     WHERE account_id = ? AND order_no = ?
     ORDER BY transaction_date_parsed ASC, order_item_no ASC, amount DESC`,
    [Number(accountId), String(orderNo)]
  );
  return rows.map((row) => ({
    ...row,
    amount: round2(row.amount),
    vat_in_amount: round2(row.vat_in_amount),
    wht_amount: round2(row.wht_amount),
  }));
}

async function listFeeTypes(filters = {}) {
  const { where, params } = buildLineFilters(filters);
  const [rows] = await db.query(
    `SELECT ${CATEGORY_SQL} AS category,
            COALESCE(NULLIF(fee_name, ''), 'Unnamed') AS fee_label,
            MAX(fee_type) AS fee_type_id,
            GROUP_CONCAT(DISTINCT NULLIF(transaction_type, '') SEPARATOR ', ') AS transaction_types,
            COALESCE(SUM(amount), 0) AS total_amount,
            COUNT(*) AS line_count,
            COUNT(DISTINCT NULLIF(order_no, '')) AS order_count
     FROM daraz_finance_transactions
     WHERE ${where.join(" AND ")}
     GROUP BY category, fee_label
     ORDER BY ABS(SUM(amount)) DESC`,
    params
  );
  return rows.map((row) => ({
    category: row.category,
    fee_name: row.fee_label,
    fee_type: row.fee_type_id,
    transaction_types: row.transaction_types,
    amount: round2(row.total_amount),
    line_count: Number(row.line_count),
    order_count: Number(row.order_count),
  }));
}

// Payout statements. GetPayoutStatus returns `payout` as text ("734.57 LKR")
// and `paid` as a 1/0 status flag, not an amount.
async function listStatements({ from, to, account_id } = {}) {
  const where = ["1=1"];
  const params = [];
  if (from) {
    where.push("DATE(daraz_created_at) >= ?");
    params.push(from);
  }
  if (to) {
    where.push("DATE(daraz_created_at) <= ?");
    params.push(to);
  }
  if (account_id) {
    where.push("account_id = ?");
    params.push(Number(account_id));
  }

  const [rows] = await db.query(
    `SELECT account_id, statement_number, payout, paid, opening_balance, closing_balance,
            item_revenue, other_revenue_total, fees_total, fees_on_refunds_total, refunds,
            guarantee_deposit, subtotal1, subtotal2, shipment_fee, shipment_fee_credit,
            daraz_created_at, daraz_updated_at
     FROM daraz_finance_payouts
     WHERE ${where.join(" AND ")}
     ORDER BY daraz_created_at DESC, id DESC
     LIMIT 500`,
    params
  );

  return rows.map((row) => ({
    account_id: row.account_id,
    statement_number: row.statement_number,
    created_at: row.daraz_created_at,
    updated_at: row.daraz_updated_at,
    is_paid: Number(row.paid) === 1,
    payout: round2(parseAmount(row.payout)),
    opening_balance: round2(row.opening_balance),
    closing_balance: round2(row.closing_balance),
    item_revenue: round2(row.item_revenue),
    other_revenue: round2(row.other_revenue_total),
    fees_total: round2(row.fees_total),
    fees_on_refunds: round2(row.fees_on_refunds_total),
    refunds: round2(row.refunds),
    guarantee_deposit: round2(row.guarantee_deposit),
    shipment_fee: round2(row.shipment_fee),
    shipment_fee_credit: round2(row.shipment_fee_credit),
    subtotal1: round2(row.subtotal1),
    subtotal2: round2(row.subtotal2),
  }));
}

async function listAccountTransactions({ from, to, account_id } = {}) {
  const where = ["1=1"];
  const params = [];
  if (from) {
    where.push("DATE(transaction_time_parsed) >= ?");
    params.push(from);
  }
  if (to) {
    where.push("DATE(transaction_time_parsed) <= ?");
    params.push(to);
  }
  if (account_id) {
    where.push("account_id = ?");
    params.push(Number(account_id));
  }
  const [rows] = await db.query(
    `SELECT account_id, transaction_number, transaction_time, transaction_time_parsed,
            transaction_type, sub_transaction_type, amount, currency, pmt_reference,
            payee_account, payee_description, remarks, tracking_json
     FROM daraz_finance_account_transactions
     WHERE ${where.join(" AND ")}
     ORDER BY transaction_time_parsed DESC, id DESC
     LIMIT 500`,
    params
  );
  return rows.map((row) => ({ ...row, amount: round2(row.amount) }));
}

module.exports = {
  CATEGORIES,
  getSummary,
  listOrders,
  getOrderLines,
  listFeeTypes,
  listStatements,
  listAccountTransactions,
};

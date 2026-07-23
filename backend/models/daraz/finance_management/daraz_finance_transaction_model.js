const db = require("../../../config/finance_management_db/finance_management_db");

function num(value) {
  if (value === undefined || value === null || value === "") return null;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function str(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim();
}

// Daraz sends transaction_date as free text (e.g. "17 May 2016") — parse it
// to a real DATE for reliable range filtering/sorting. Falls back to null
// (excluded from date-range filters, but still visible/summed overall) if
// the text can't be parsed.
function parseDate(value) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10);
}

function buildFilters({ account_id, order_no, date_from, date_to } = {}) {
  const params = [];
  let whereSql = "WHERE 1=1";

  if (account_id) {
    whereSql += " AND account_id = ?";
    params.push(account_id);
  }

  if (order_no) {
    whereSql += " AND order_no = ?";
    params.push(order_no);
  }

  if (date_from) {
    whereSql += " AND transaction_date_parsed >= ?";
    params.push(date_from);
  }

  if (date_to) {
    whereSql += " AND transaction_date_parsed <= ?";
    params.push(date_to);
  }

  return { whereSql, params };
}

async function upsertTransaction(accountId, row = {}) {
  const transactionNumber = str(row.transaction_number);
  if (!transactionNumber) return null;

  const transactionDate = str(row.transaction_date);
  const transactionDateParsed = parseDate(transactionDate);

  await db.query(
    `INSERT INTO daraz_finance_transactions
       (account_id, transaction_number, order_no, order_item_no, transaction_date, transaction_date_parsed,
        amount, paid_status, shipping_provider, wht_included_in_amount, wht_amount, vat_in_amount,
        payment_ref_id, seller_sku, lazada_sku, fee_type, fee_name, transaction_type,
        order_item_status, reference, shipping_speed, statement, details, comment,
        shipment_type, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       order_no = VALUES(order_no),
       order_item_no = VALUES(order_item_no),
       transaction_date = VALUES(transaction_date),
       transaction_date_parsed = VALUES(transaction_date_parsed),
       amount = VALUES(amount),
       paid_status = VALUES(paid_status),
       shipping_provider = VALUES(shipping_provider),
       wht_included_in_amount = VALUES(wht_included_in_amount),
       wht_amount = VALUES(wht_amount),
       vat_in_amount = VALUES(vat_in_amount),
       payment_ref_id = VALUES(payment_ref_id),
       seller_sku = VALUES(seller_sku),
       lazada_sku = VALUES(lazada_sku),
       fee_type = VALUES(fee_type),
       fee_name = VALUES(fee_name),
       transaction_type = VALUES(transaction_type),
       order_item_status = VALUES(order_item_status),
       reference = VALUES(reference),
       shipping_speed = VALUES(shipping_speed),
       statement = VALUES(statement),
       details = VALUES(details),
       comment = VALUES(comment),
       shipment_type = VALUES(shipment_type),
       raw_json = VALUES(raw_json)`,
    [
      accountId,
      transactionNumber,
      str(row.order_no),
      str(row.orderItem_no),
      transactionDate,
      transactionDateParsed,
      num(row.amount),
      str(row.paid_status),
      str(row.shipping_provider),
      str(row.WHT_included_in_amount),
      num(row.WHT_amount),
      num(row.VAT_in_amount),
      str(row.payment_ref_id),
      str(row.seller_sku),
      str(row.lazada_sku),
      str(row.fee_type),
      str(row.fee_name),
      str(row.transaction_type),
      str(row.orderItem_status),
      str(row.reference),
      str(row.shipping_speed),
      str(row.statement),
      str(row.details),
      str(row.comment),
      str(row.shipment_type),
      JSON.stringify(row),
    ]
  );

  const [rows] = await db.query(
    `SELECT * FROM daraz_finance_transactions WHERE account_id = ? AND transaction_number = ? LIMIT 1`,
    [accountId, transactionNumber]
  );

  return rows[0] || null;
}

async function listTransactions({ account_id, order_no, date_from, date_to, limit = 100, offset = 0 } = {}) {
  const { whereSql, params } = buildFilters({ account_id, order_no, date_from, date_to });

  const [rows] = await db.query(
    `SELECT * FROM daraz_finance_transactions ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  return rows;
}

// SQL-level GROUP BY order_no so totals/line-counts are accurate across the
// whole filtered dataset, not just whatever page of raw rows happened to be
// loaded client-side.
async function listOrderGroups({ account_id, date_from, date_to, limit = 100, offset = 0 } = {}) {
  const { whereSql, params } = buildFilters({ account_id, date_from, date_to });

  const [rows] = await db.query(
    `SELECT
       order_no,
       MAX(account_id) AS account_id,
       COUNT(*) AS line_count,
       SUM(amount) AS net_amount,
       MAX(transaction_date) AS latest_date,
       MAX(id) AS latest_id,
       GROUP_CONCAT(DISTINCT NULLIF(seller_sku, '') SEPARATOR ', ') AS seller_skus,
       GROUP_CONCAT(DISTINCT NULLIF(lazada_sku, '') SEPARATOR ', ') AS lazada_skus
     FROM daraz_finance_transactions
     ${whereSql}
     GROUP BY order_no
     ORDER BY latest_id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const [countRows] = await db.query(
    `SELECT COUNT(DISTINCT order_no) AS total FROM daraz_finance_transactions ${whereSql}`,
    params
  );

  return { rows, total: Number(countRows?.[0]?.total || 0) };
}

async function getTransactionSummary({ account_id, date_from, date_to } = {}) {
  const { whereSql, params } = buildFilters({ account_id, date_from, date_to });

  const [rows] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS total_expense,
       COALESCE(SUM(amount), 0) AS net_sales,
       COALESCE(SUM(CASE WHEN transaction_type LIKE '%penalt%' OR fee_name LIKE '%penalt%' THEN ABS(amount) ELSE 0 END), 0) AS total_penalties,
       COUNT(*) AS total_transactions,
       COUNT(DISTINCT order_no) AS total_orders
     FROM daraz_finance_transactions
     ${whereSql}`,
    params
  );

  return rows[0] || null;
}

module.exports = {
  upsertTransaction,
  listTransactions,
  listOrderGroups,
  getTransactionSummary,
};

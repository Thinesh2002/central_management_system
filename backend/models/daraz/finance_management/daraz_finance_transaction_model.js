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

async function upsertTransaction(accountId, row = {}) {
  const transactionNumber = str(row.transaction_number);
  if (!transactionNumber) return null;

  await db.query(
    `INSERT INTO daraz_finance_transactions
       (account_id, transaction_number, order_no, order_item_no, transaction_date, amount,
        paid_status, shipping_provider, wht_included_in_amount, wht_amount, vat_in_amount,
        payment_ref_id, seller_sku, lazada_sku, fee_type, fee_name, transaction_type,
        order_item_status, reference, shipping_speed, statement, details, comment,
        shipment_type, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       order_no = VALUES(order_no),
       order_item_no = VALUES(order_item_no),
       transaction_date = VALUES(transaction_date),
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
      str(row.transaction_date),
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

async function listTransactions({ account_id, order_no, limit = 100, offset = 0 } = {}) {
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

  const [rows] = await db.query(
    `SELECT * FROM daraz_finance_transactions ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  return rows;
}

async function getTransactionSummary({ account_id } = {}) {
  const params = [];
  let whereSql = "WHERE 1=1";

  if (account_id) {
    whereSql += " AND account_id = ?";
    params.push(account_id);
  }

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

module.exports = { upsertTransaction, listTransactions, getTransactionSummary };

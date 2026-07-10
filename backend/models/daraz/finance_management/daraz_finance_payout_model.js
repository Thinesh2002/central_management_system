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

async function upsertPayout(accountId, row = {}) {
  const statementNumber = str(row.statement_number);
  if (!statementNumber) return null;

  await db.query(
    `INSERT INTO daraz_finance_payouts
       (account_id, statement_number, opening_balance, closing_balance, payout, paid,
        item_revenue, other_revenue_total, fees_total, fees_on_refunds_total, refunds,
        guarantee_deposit, subtotal1, subtotal2, shipment_fee, shipment_fee_credit,
        daraz_created_at, daraz_updated_at, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       opening_balance = VALUES(opening_balance),
       closing_balance = VALUES(closing_balance),
       payout = VALUES(payout),
       paid = VALUES(paid),
       item_revenue = VALUES(item_revenue),
       other_revenue_total = VALUES(other_revenue_total),
       fees_total = VALUES(fees_total),
       fees_on_refunds_total = VALUES(fees_on_refunds_total),
       refunds = VALUES(refunds),
       guarantee_deposit = VALUES(guarantee_deposit),
       subtotal1 = VALUES(subtotal1),
       subtotal2 = VALUES(subtotal2),
       shipment_fee = VALUES(shipment_fee),
       shipment_fee_credit = VALUES(shipment_fee_credit),
       daraz_created_at = VALUES(daraz_created_at),
       daraz_updated_at = VALUES(daraz_updated_at),
       raw_json = VALUES(raw_json)`,
    [
      accountId,
      statementNumber,
      num(row.opening_balance),
      num(row.closing_balance),
      str(row.payout),
      num(row.paid),
      num(row.item_revenue),
      num(row.other_revenue_total),
      num(row.fees_total),
      num(row.fees_on_refunds_total),
      num(row.refunds),
      num(row.guarantee_deposit),
      num(row.subtotal1),
      num(row.subtotal2),
      num(row.shipment_fee),
      num(row.shipment_fee_credit),
      str(row.created_at),
      str(row.updated_at),
      JSON.stringify(row),
    ]
  );

  const [rows] = await db.query(
    `SELECT * FROM daraz_finance_payouts WHERE account_id = ? AND statement_number = ? LIMIT 1`,
    [accountId, statementNumber]
  );

  return rows[0] || null;
}

async function listPayouts({ account_id, limit = 100, offset = 0 } = {}) {
  const params = [];
  let whereSql = "WHERE 1=1";

  if (account_id) {
    whereSql += " AND account_id = ?";
    params.push(account_id);
  }

  const [rows] = await db.query(
    `SELECT * FROM daraz_finance_payouts ${whereSql} ORDER BY daraz_created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  return rows;
}

async function getPayoutSummary({ account_id } = {}) {
  const params = [];
  let whereSql = "WHERE 1=1";

  if (account_id) {
    whereSql += " AND account_id = ?";
    params.push(account_id);
  }

  const [rows] = await db.query(
    `SELECT
       COALESCE(SUM(opening_balance), 0) AS total_opening_balance,
       COALESCE(SUM(closing_balance), 0) AS total_closing_balance,
       COALESCE(SUM(paid), 0) AS total_paid,
       COALESCE(SUM(item_revenue), 0) AS total_item_revenue,
       COALESCE(SUM(other_revenue_total), 0) AS total_other_revenue,
       COALESCE(SUM(fees_total), 0) AS total_fees,
       COALESCE(SUM(fees_on_refunds_total), 0) AS total_fees_on_refunds,
       COALESCE(SUM(refunds), 0) AS total_refunds,
       COALESCE(SUM(guarantee_deposit), 0) AS total_guarantee_deposit,
       COUNT(*) AS total_statements
     FROM daraz_finance_payouts
     ${whereSql}`,
    params
  );

  return rows[0] || null;
}

module.exports = { upsertPayout, listPayouts, getPayoutSummary };

const db = require("../../../config/finance_management_db/finance_management_db");

function str(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim();
}

function num(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function dateTime(value) {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

async function upsertAccountTransaction(accountId, row = {}) {
  const transactionNumber = str(row.transaction_number);
  if (!transactionNumber) return null;

  const payee = row.payee_account && typeof row.payee_account === "object" ? row.payee_account : {};
  await db.query(
    `INSERT INTO daraz_finance_account_transactions
       (account_id, transaction_number, transaction_time, transaction_time_parsed,
        transaction_type, sub_transaction_type, amount, currency, pmt_reference,
        payee_account, payee_description, remarks, tracking_json, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       transaction_time = VALUES(transaction_time),
       transaction_time_parsed = VALUES(transaction_time_parsed),
       transaction_type = VALUES(transaction_type),
       sub_transaction_type = VALUES(sub_transaction_type),
       amount = VALUES(amount),
       currency = VALUES(currency),
       pmt_reference = VALUES(pmt_reference),
       payee_account = VALUES(payee_account),
       payee_description = VALUES(payee_description),
       remarks = VALUES(remarks),
       tracking_json = VALUES(tracking_json),
       raw_json = VALUES(raw_json)`,
    [
      accountId,
      transactionNumber,
      str(row.transaction_time),
      dateTime(row.transaction_time),
      str(row.type),
      str(row.sub_type),
      num(row.amount),
      str(row.currency),
      str(row.pmt_reference),
      str(payee.account),
      str(payee.description),
      str(row.remarks),
      JSON.stringify(Array.isArray(row.tracking_list) ? row.tracking_list : []),
      JSON.stringify(row),
    ]
  );
  return transactionNumber;
}

module.exports = { upsertAccountTransaction };

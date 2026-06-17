const db = require("../../../../config/finance_db");

function cleanAmount(value) {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/,/g, ""));
}

// 🔥 FIX: Convert Daraz Date → MySQL DATE format
function formatDateForMySQL(dateStr) {
  if (!dateStr) return null;

  const parsed = new Date(dateStr);
  if (isNaN(parsed)) return null;

  return parsed.toISOString().split("T")[0]; // YYYY-MM-DD
}

exports.upsertFinanceTransaction = async (account_code, item) => {

  const sql = `
    INSERT INTO daraz_finance_transactions (
      account_code,
      transaction_number,
      order_no,
      orderItem_no,
      transaction_date,
      statement,
      fee_type,
      fee_name,
      transaction_type,
      amount,
      VAT_in_amount,
      WHT_amount,
      paid_status,
      seller_sku,
      product_name,
      product_main_image
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      amount = VALUES(amount),
      VAT_in_amount = VALUES(VAT_in_amount),
      WHT_amount = VALUES(WHT_amount),
      paid_status = VALUES(paid_status),
      seller_sku = VALUES(seller_sku),
      product_name = VALUES(product_name),
      product_main_image = VALUES(product_main_image)
  `;

  await db.query(sql, [
    account_code,
    item.transaction_number || null,
    item.order_no || null,
    item.orderItem_no || null,
    formatDateForMySQL(item.transaction_date), // ✅ FIXED
    item.statement || null,
    item.fee_type || null,
    item.fee_name || null,
    item.transaction_type || null,
    cleanAmount(item.amount),
    cleanAmount(item.VAT_in_amount),
    cleanAmount(item.WHT_amount),
    item.paid_status || null,
    item.seller_sku || null,
    item.product_name || null,
    item.product_main_image || null
  ]);
};

exports.getAllFinanceData = async () => {
  const [rows] = await db.query(
    "SELECT * FROM daraz_finance_transactions ORDER BY transaction_date DESC"
  );
  return rows;
};

exports.getFinanceData = async (filters = {}) => {

  let sql = `
    SELECT *
    FROM daraz_finance_transactions
    WHERE 1=1
  `;

  let params = [];

  if (filters.account_code) {
    sql += " AND account_code = ?";
    params.push(filters.account_code);
  }

  if (filters.start_date) {
    sql += " AND transaction_date >= ?";
    params.push(filters.start_date);
  }

  if (filters.end_date) {
    sql += " AND transaction_date <= ?";
    params.push(filters.end_date);
  }

  sql += " ORDER BY transaction_date DESC";

  const [rows] = await db.query(sql, params);
  return rows;
};
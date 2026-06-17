const db = require("../../config/finance_db");

/* ================= CREATE INCOME ================= */
const createIncome = async (data) => {
  // Unga table-la irukira 8 columns (ID matrum Created_at thavira)
  const sql = `
    INSERT INTO incomes (
      source_name,
      order_number,
      gross_amount,
      net_amount,
      platform_fee,
      commission,
      income_date,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Frontend-la irunthu vara data-ah unga table columns-ku map panrom
  const values = [
    data.source_name || "whatsapp",
    data.order_number,
    Number(data.gross_amount || 0),
    Number(data.net_amount || 0), // Ippo intha column unga table-la iruku
    Number(data.platform_fee || 0),
    Number(data.commission || 0),
    data.income_date || new Date().toISOString().split('T')[0],
    data.notes || ""
  ];

  const [result] = await db.query(sql, values);
  return result;
};

/* ================= VIEW ALL INCOMES ================= */
const getAllIncomes = async () => {
  const sql = `SELECT * FROM incomes ORDER BY income_date DESC`;
  const [rows] = await db.query(sql);
  return rows;
};

/* ================= UPDATE INCOME ================= */
const updateIncome = async (id, data) => {
  const sql = `
    UPDATE incomes SET
      source_name = ?,
      order_number = ?,
      gross_amount = ?,
      net_amount = ?,
      platform_fee = ?,
      commission = ?,
      income_date = ?,
      notes = ?
    WHERE id = ?
  `;

  const values = [
    data.source_name,
    data.order_number,
    Number(data.gross_amount),
    Number(data.net_amount),
    Number(data.platform_fee),
    Number(data.commission),
    data.income_date,
    data.notes,
    id
  ];

  const [result] = await db.query(sql, values);
  return result;
};

/* ================= DELETE INCOME ================= */
const deleteIncome = async (id) => {
  const sql = `DELETE FROM incomes WHERE id = ?`;
  const [result] = await db.query(sql, [id]);
  return result;
};

module.exports = {
  createIncome,
  getAllIncomes,
  updateIncome,
  deleteIncome
};
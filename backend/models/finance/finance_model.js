const db = require('../../config/finance_management_db/cm_finance_management');
const { listParams, toMoney, clean } = require('../../utils/business/query_helpers');

function buildFilters(params = {}, values = []) {
  const where = [];
  if (params.channel && String(params.channel).toUpperCase() !== 'ALL') {
    where.push('channel = ?');
    values.push(String(params.channel).toUpperCase());
  }
  if (params.account_id) {
    where.push('account_id = ?');
    values.push(params.account_id);
  }
  if (params.account_code) {
    where.push('account_code = ?');
    values.push(params.account_code);
  }
  if (params.date_from) {
    where.push('summary_date >= ?');
    values.push(params.date_from);
  }
  if (params.date_to) {
    where.push('summary_date <= ?');
    values.push(params.date_to);
  }
  return where;
}

async function summary(params = {}) {
  const values = [];
  const where = buildFilters(params, values);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[row]] = await db.query(
    `SELECT
       COALESCE(SUM(gross_sales), 0) AS gross_sales,
       COALESCE(SUM(discount_amount), 0) AS discount_amount,
       COALESCE(SUM(refund_amount), 0) AS refund_amount,
       COALESCE(SUM(cancelled_amount), 0) AS cancelled_amount,
       COALESCE(SUM(net_sales), 0) AS net_sales,
       COALESCE(SUM(product_cost), 0) AS product_cost,
       COALESCE(SUM(shipping_cost), 0) AS shipping_cost,
       COALESCE(SUM(marketplace_fee), 0) AS marketplace_fee,
       COALESCE(SUM(payment_fee), 0) AS payment_fee,
       COALESCE(SUM(packing_cost), 0) AS packing_cost,
       COALESCE(SUM(other_expense), 0) AS other_expense,
       COALESCE(SUM(net_profit), 0) AS net_profit,
       COALESCE(SUM(orders_count), 0) AS total_orders,
       COALESCE(SUM(delivered_orders), 0) AS delivered_orders,
       COALESCE(SUM(cancelled_orders), 0) AS cancelled_orders,
       COALESCE(SUM(returned_orders), 0) AS returned_orders
     FROM sales_finance_daily_summary
     ${whereSql}`,
    values
  );

  const netSales = Number(row.net_sales || 0);
  const netProfit = Number(row.net_profit || 0);
  return { ...row, profit_margin: netSales ? Number(((netProfit / netSales) * 100).toFixed(2)) : 0 };
}

async function daily(params = {}) {
  const values = [];
  const where = buildFilters(params, values);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT summary_date,
            COALESCE(SUM(gross_sales), 0) AS gross_sales,
            COALESCE(SUM(net_sales), 0) AS net_sales,
            COALESCE(SUM(net_profit), 0) AS net_profit,
            COALESCE(SUM(orders_count), 0) AS orders_count
     FROM sales_finance_daily_summary
     ${whereSql}
     GROUP BY summary_date
     ORDER BY summary_date ASC`,
    values
  );
  return rows;
}

async function channelWise(params = {}) {
  const values = [];
  const where = buildFilters({ ...params, channel: 'ALL' }, values);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT channel,
            COALESCE(SUM(gross_sales), 0) AS gross_sales,
            COALESCE(SUM(net_sales), 0) AS net_sales,
            COALESCE(SUM(net_profit), 0) AS net_profit,
            COALESCE(SUM(orders_count), 0) AS orders_count
     FROM sales_finance_daily_summary
     ${whereSql}
     GROUP BY channel
     ORDER BY net_sales DESC`,
    values
  );
  return rows;
}

async function orderWise(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 500);
  const values = [];
  const where = [];
  if (params.channel && String(params.channel).toUpperCase() !== 'ALL') {
    where.push('channel = ?');
    values.push(String(params.channel).toUpperCase());
  }
  if (params.account_id) { where.push('account_id = ?'); values.push(params.account_id); }
  if (params.account_code) { where.push('account_code = ?'); values.push(params.account_code); }
  if (params.date_from) { where.push('order_date >= ?'); values.push(params.date_from); }
  if (params.date_to) { where.push('order_date < DATE_ADD(?, INTERVAL 1 DAY)'); values.push(params.date_to); }
  if (params.search) {
    where.push('(order_number LIKE ? OR order_id LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT * FROM order_profit_summary ${whereSql} ORDER BY order_date DESC, id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM order_profit_summary ${whereSql}`, values);
  return { rows, pagination: { page, limit, offset, total: Number(countRow.total || 0) } };
}

async function topProducts(params = {}) {
  const values = [];
  const where = [];
  if (params.channel && String(params.channel).toUpperCase() !== 'ALL') { where.push('channel = ?'); values.push(String(params.channel).toUpperCase()); }
  if (params.date_from) { where.push('order_date >= ?'); values.push(params.date_from); }
  if (params.date_to) { where.push('order_date < DATE_ADD(?, INTERVAL 1 DAY)'); values.push(params.date_to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT channel, order_number, COUNT(*) AS order_rows,
            COALESCE(SUM(net_sales), 0) AS net_sales,
            COALESCE(SUM(net_profit), 0) AS net_profit
     FROM order_profit_summary
     ${whereSql}
     GROUP BY channel, order_number
     ORDER BY net_sales DESC
     LIMIT 20`,
    values
  );
  return rows;
}

async function expenses(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 500);
  const values = [];
  const where = [];
  if (params.channel && String(params.channel).toUpperCase() !== 'ALL') { where.push('channel = ?'); values.push(String(params.channel).toUpperCase()); }
  if (params.account_id) { where.push('account_id = ?'); values.push(params.account_id); }
  if (params.date_from) { where.push('expense_date >= ?'); values.push(params.date_from); }
  if (params.date_to) { where.push('expense_date <= ?'); values.push(params.date_to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(`SELECT * FROM business_expenses ${whereSql} ORDER BY expense_date DESC, id DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
  const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM business_expenses ${whereSql}`, values);
  return { rows, pagination: { page, limit, offset, total: Number(countRow.total || 0) } };
}

async function createExpense(payload = {}, userId = null) {
  const [result] = await db.query(
    `INSERT INTO business_expenses (expense_date, expense_type, channel, account_id, amount, note, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [payload.expense_date, clean(payload.expense_type || 'OTHER'), clean(payload.channel || 'ALL').toUpperCase(), payload.account_id || null, toMoney(payload.amount, 0), payload.note || null, userId]
  );
  const [rows] = await db.query('SELECT * FROM business_expenses WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function updateExpense(id, payload = {}) {
  await db.query(
    `UPDATE business_expenses
     SET expense_date = COALESCE(?, expense_date),
         expense_type = COALESCE(?, expense_type),
         channel = COALESCE(?, channel),
         account_id = ?,
         amount = COALESCE(?, amount),
         note = COALESCE(?, note)
     WHERE id = ?`,
    [payload.expense_date || null, payload.expense_type || null, payload.channel ? String(payload.channel).toUpperCase() : null, payload.account_id || null, payload.amount !== undefined ? toMoney(payload.amount, 0) : null, payload.note || null, id]
  );
  const [rows] = await db.query('SELECT * FROM business_expenses WHERE id = ?', [id]);
  return rows[0] || null;
}

async function deleteExpense(id) {
  const [rows] = await db.query('SELECT * FROM business_expenses WHERE id = ?', [id]);
  await db.query('DELETE FROM business_expenses WHERE id = ?', [id]);
  return rows[0] || null;
}

async function recalculate() {
  // Lightweight recalculation from order_profit_summary. Marketplace sync jobs can upsert order_profit_summary first.
  await db.query(
    `INSERT INTO sales_finance_daily_summary
      (summary_date, channel, account_id, account_code, gross_sales, discount_amount, refund_amount, cancelled_amount,
       net_sales, product_cost, shipping_cost, marketplace_fee, payment_fee, packing_cost, other_expense,
       net_profit, orders_count, delivered_orders, cancelled_orders, returned_orders, created_at, updated_at)
     SELECT DATE(order_date), channel, account_id, account_code,
       SUM(gross_sales), SUM(discount_amount), SUM(refund_amount), SUM(CASE WHEN order_status='Cancelled' THEN gross_sales ELSE 0 END),
       SUM(net_sales), SUM(product_cost), SUM(shipping_cost), SUM(marketplace_fee), SUM(payment_fee), 0, SUM(other_expense),
       SUM(net_profit), COUNT(*), SUM(order_status IN ('Delivered','Completed','completed')), SUM(order_status IN ('Cancelled','cancelled')), SUM(order_status IN ('Returned','returned','Refunded','refunded')), NOW(), NOW()
     FROM order_profit_summary
     GROUP BY DATE(order_date), channel, account_id, account_code
     ON DUPLICATE KEY UPDATE
       gross_sales=VALUES(gross_sales), discount_amount=VALUES(discount_amount), refund_amount=VALUES(refund_amount), cancelled_amount=VALUES(cancelled_amount),
       net_sales=VALUES(net_sales), product_cost=VALUES(product_cost), shipping_cost=VALUES(shipping_cost), marketplace_fee=VALUES(marketplace_fee), payment_fee=VALUES(payment_fee),
       other_expense=VALUES(other_expense), net_profit=VALUES(net_profit), orders_count=VALUES(orders_count), delivered_orders=VALUES(delivered_orders),
       cancelled_orders=VALUES(cancelled_orders), returned_orders=VALUES(returned_orders), updated_at=NOW()`
  );
  return summary({});
}

module.exports = { summary, daily, channelWise, orderWise, topProducts, expenses, createExpense, updateExpense, deleteExpense, recalculate };

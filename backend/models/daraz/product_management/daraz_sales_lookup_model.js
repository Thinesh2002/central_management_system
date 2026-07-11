const orderDb = require("../../../config/order_management_db/order_management_db");

async function getRecentlySoldSkus({ accountName, sinceDate }) {
  if (!accountName) return new Set();

  const [rows] = await orderDb.query(
    `SELECT DISTINCT i.seller_sku
     FROM daraz_order_items i
     INNER JOIN daraz_orders o ON o.id = i.daraz_order_id
     WHERE o.account_name = ? AND o.order_date >= ?`,
    [accountName, sinceDate]
  );

  return new Set(rows.map((row) => row.seller_sku).filter(Boolean));
}

async function getSalesWindow({ accountName, sellerSku, from, to }) {
  if (!accountName || !sellerSku) return { units: 0, revenue: 0 };

  const [rows] = await orderDb.query(
    `SELECT COUNT(*) AS units, COALESCE(SUM(i.line_total), 0) AS revenue
     FROM daraz_order_items i
     INNER JOIN daraz_orders o ON o.id = i.daraz_order_id
     WHERE o.account_name = ? AND i.seller_sku = ? AND o.order_date >= ? AND o.order_date < ?`,
    [accountName, sellerSku, from, to]
  );

  return {
    units: Number(rows[0]?.units || 0),
    revenue: Number(rows[0]?.revenue || 0),
  };
}

module.exports = { getRecentlySoldSkus, getSalesWindow };

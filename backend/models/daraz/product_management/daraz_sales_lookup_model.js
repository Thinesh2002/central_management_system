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

module.exports = { getRecentlySoldSkus };

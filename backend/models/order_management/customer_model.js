const { createGenericModel, db } = require("./_shared/generic_table_model");

const base = createGenericModel("customers", {
  dateColumn: "created_at",
  defaultSort: "id",
});

// orders, daraz_orders and woo_orders each carry their own customer_id FK —
// pull all three and merge into one chronological history instead of just
// local (manual) orders.
async function findByIdWithOrders(id) {
  const customer = await base.findById(id);
  if (!customer) return null;

  const [localOrders] = await db.query(
    "SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC",
    [id]
  );

  const [darazOrders] = await db.query(
    "SELECT * FROM daraz_orders WHERE customer_id = ? ORDER BY order_date DESC",
    [id]
  );

  const [wooOrders] = await db.query(
    "SELECT * FROM woo_orders WHERE customer_id = ? ORDER BY order_date DESC",
    [id]
  );

  const orders = [
    ...localOrders.map((row) => ({
      ...row,
      platform: "LOCAL",
      order_no: row.order_no,
      total: row.grand_total,
    })),
    ...darazOrders.map((row) => ({
      ...row,
      platform: "DARAZ",
      order_no: row.order_number || row.daraz_order_id,
      total: row.grand_total,
    })),
    ...wooOrders.map((row) => ({
      ...row,
      platform: "WOO",
      order_no: row.order_number || row.woo_order_id,
      total: row.grand_total,
    })),
  ].sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

  return { ...customer, orders };
}

module.exports = { ...base, findByIdWithOrders };

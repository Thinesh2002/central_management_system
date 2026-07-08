const { createGenericModel, db } = require("./_shared/generic_table_model");

const base = createGenericModel("customers", {
  dateColumn: "created_at",
  defaultSort: "id",
});

// Only the local `orders` table carries a customer_id FK — Daraz/Woo orders
// store buyer info inline (no link back to a customer record), so a
// customer's visible order history here is their local orders only.
async function findByIdWithOrders(id) {
  const customer = await base.findById(id);
  if (!customer) return null;

  const [orders] = await db.query(
    "SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC",
    [id]
  );

  return { ...customer, orders };
}

module.exports = { ...base, findByIdWithOrders };

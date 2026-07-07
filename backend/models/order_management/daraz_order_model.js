const { createGenericModel, db } = require("./_shared/generic_table_model");

const base = createGenericModel("daraz_orders", {
  dateColumn: "order_date",
  defaultSort: "order_date",
});

async function findByIdWithItems(id) {
  const order = await base.findById(id);
  if (!order) return null;

  const [items] = await db.query(
    "SELECT * FROM daraz_order_items WHERE daraz_order_id = ? ORDER BY id ASC",
    [id]
  );

  return { ...order, items };
}

module.exports = { ...base, findByIdWithItems };

const { createGenericModel, db } = require("./_shared/generic_table_model");

const model = createGenericModel("message_logs", { dateColumn: "sent_at", defaultSort: "sent_at" });

async function listForOrder(source, sourceOrderId) {
  const [rows] = await db.query(
    "SELECT * FROM message_logs WHERE source = ? AND source_order_id = ? ORDER BY sent_at DESC",
    [source, sourceOrderId]
  );
  return rows;
}

module.exports = { ...model, listForOrder };

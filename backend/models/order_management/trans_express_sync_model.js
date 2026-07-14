const { db, createGenericModel } = require("./_shared/generic_table_model");

const orders = createGenericModel("orders");

const TERMINAL_STATUSES = ["delivered", "cancelled", "canceled", "returned"];

// Local orders only - Daraz/Woo have their own courier integrations. Once an
// order's own order_status reaches a terminal state there's nothing left to
// track, so it naturally drops out of every future hourly run.
async function getOrdersNeedingTracking() {
  const [rows] = await db.query(
    `SELECT id, waybill_id, order_status FROM orders
     WHERE waybill_id IS NOT NULL AND waybill_id <> ''
       AND order_status NOT IN (${TERMINAL_STATUSES.map(() => "?").join(",")})
     ORDER BY id ASC`,
    TERMINAL_STATUSES
  );

  return rows;
}

async function markDelivered(orderId) {
  return orders.update(orderId, { order_status: "delivered", delivered_at: new Date() });
}

module.exports = { getOrdersNeedingTracking, markDelivered };

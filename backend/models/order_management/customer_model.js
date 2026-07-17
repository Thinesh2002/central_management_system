const { createGenericModel, db } = require("./_shared/generic_table_model");

const base = createGenericModel("customers", {
  dateColumn: "created_at",
  defaultSort: "id",
});

// Marketplace sync jobs (Daraz, Woo) call this to link each order to a
// customer row instead of only storing buyer info as flat text on the
// order — mirrors the phone-based find-or-create already used by
// createManualOrder() in order_model.js, so a buyer who orders through
// both a marketplace and a manual order resolves to the same customer.
async function findOrCreateFromMarketplaceOrder({ phone, name, shipping = {}, sourceType, account }) {
  if (!phone) return null;

  const [existingRows] = await db.query("SELECT id FROM customers WHERE phone = ? LIMIT 1", [phone]);
  if (existingRows.length) return existingRows[0].id;

  const created = await base.create({
    customer_name: name || phone,
    phone,
    shipping_full_name: name || null,
    shipping_phone: phone,
    shipping_address_line1: shipping.address1 || null,
    shipping_address_line2: shipping.address2 || null,
    shipping_city: shipping.city || null,
    shipping_postal_code: shipping.post_code || null,
    shipping_country: shipping.country || undefined,
    source_type: sourceType,
    source_account_id: account?.id || null,
    source_account_code: account?.account_code || null,
    source_account_name: account?.account_name || null,
    status: "ACTIVE",
  });

  return created?.id || null;
}

// customers.total_orders/total_spent are maintained by the external
// order-sync pipeline and can drift out of date — compute both live from
// the actual linked orders instead of trusting the stored columns.
// Cancelled/returned orders never count as real revenue, matching the
// same rule used by the SKU Economics Report.
const EXCLUDED_STATUSES = new Set(["cancelled", "canceled", "returned", "shipped_back_success"]);

function isCountableStatus(status) {
  return !EXCLUDED_STATUSES.has(String(status || "").toLowerCase());
}

function inClause(values) {
  return values.map(() => "?").join(",");
}

async function getOrderStatsForCustomerIds(customerIds) {
  const statsMap = new Map();
  if (!customerIds.length) return statsMap;

  const placeholders = inClause(customerIds);

  const [rows] = await db.query(
    `
    SELECT customer_id, grand_total, order_date, order_status
    FROM orders WHERE customer_id IN (${placeholders})
    UNION ALL
    SELECT customer_id, grand_total, order_date, order_status
    FROM daraz_orders WHERE customer_id IN (${placeholders})
    UNION ALL
    SELECT customer_id, grand_total, order_date, order_status
    FROM woo_orders WHERE customer_id IN (${placeholders})
    `,
    [...customerIds, ...customerIds, ...customerIds]
  );

  rows.forEach((row) => {
    if (!isCountableStatus(row.order_status)) return;

    const existing = statsMap.get(row.customer_id) || {
      order_count: 0,
      total_spent: 0,
      last_order_at: null,
    };

    existing.order_count += 1;
    existing.total_spent += Number(row.grand_total || 0);

    if (!existing.last_order_at || new Date(row.order_date) > new Date(existing.last_order_at)) {
      existing.last_order_at = row.order_date;
    }

    statsMap.set(row.customer_id, existing);
  });

  statsMap.forEach((stats) => {
    stats.total_spent = Number(stats.total_spent.toFixed(2));
  });

  return statsMap;
}

async function listWithLiveStats(params) {
  const result = await base.list(params);
  const ids = result.data.map((row) => row.id);
  const statsMap = await getOrderStatsForCustomerIds(ids);

  const data = result.data.map((customer) => {
    const stats = statsMap.get(customer.id) || {
      order_count: 0,
      total_spent: 0,
      last_order_at: null,
    };

    return {
      ...customer,
      total_orders: stats.order_count,
      total_spent: stats.total_spent,
      last_order_at: stats.last_order_at || customer.last_order_at,
    };
  });

  return { ...result, data };
}

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

  const countableOrders = orders.filter((row) => isCountableStatus(row.order_status));

  return {
    ...customer,
    total_orders: countableOrders.length,
    total_spent: Number(
      countableOrders.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)
    ),
    last_order_at: orders[0]?.order_date || null,
    orders,
  };
}

module.exports = { ...base, listWithLiveStats, findByIdWithOrders, findOrCreateFromMarketplaceOrder };

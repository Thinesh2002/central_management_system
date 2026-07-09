const { createGenericModel, db } = require("./_shared/generic_table_model");

const base = createGenericModel("orders", {
  dateColumn: "order_date",
  defaultSort: "order_date",
});

const EXCLUDED_STATUSES = new Set(["cancelled", "canceled", "returned", "shipped_back_success"]);

function isCountableStatus(status) {
  return !EXCLUDED_STATUSES.has(String(status || "").toLowerCase());
}

const SOURCES = {
  local: { table: "orders", itemsTable: "order_items", itemsFk: "order_id", label: "Manual" },
  daraz: { table: "daraz_orders", itemsTable: "daraz_order_items", itemsFk: "daraz_order_id", label: "Daraz" },
  woo: { table: "woo_orders", itemsTable: "woo_order_items", itemsFk: "woo_order_id", label: "WooCommerce" },
};

function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

function getSourceConfig(source) {
  const config = SOURCES[String(source || "").toLowerCase()];
  if (!config) throw new Error(`Unknown order source: ${source}`);
  return config;
}

async function findByIdWithItems(id) {
  const order = await base.findById(id);
  if (!order) return null;

  const [items] = await db.query(
    "SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC",
    [id]
  );

  return { ...order, items };
}

// Every real column an order row might carry the identifying number under —
// used defensively since local/daraz/woo orders don't share one convention.
function getOrderNo(row, source) {
  if (source === "local") return row.order_no;
  return row.order_number || row.daraz_order_id || row.woo_order_id || row.id;
}

function normalizeOrderRow(row, source) {
  const config = SOURCES[source];

  return {
    ...row,
    source,
    source_label: config.label,
    source_order_id: row.id,
    order_no: getOrderNo(row, source),
    display_order_no: source === "local" ? row.order_no : getOrderNo(row, source),
  };
}

async function listUnified({ limit = 1000, dateFrom, dateTo } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 1000, 1), 5000);

  const queries = Object.entries(SOURCES).map(async ([source, config]) => {
    const where = [];
    const values = [];

    if (dateFrom) {
      where.push("order_date >= ?");
      values.push(dateFrom);
    }

    if (dateTo) {
      where.push("order_date <= ?");
      values.push(`${dateTo} 23:59:59`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `SELECT * FROM ${qid(config.table)} ${whereClause} ORDER BY order_date DESC LIMIT ?`,
      [...values, safeLimit]
    );

    return rows.map((row) => normalizeOrderRow(row, source));
  });

  const results = await Promise.all(queries);
  const merged = results.flat().sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

  return merged.slice(0, safeLimit);
}

async function getUnified(source, id) {
  const config = getSourceConfig(source);

  const [orderRows] = await db.query(
    `SELECT * FROM ${qid(config.table)} WHERE id = ? LIMIT 1`,
    [id]
  );

  if (!orderRows.length) return null;

  const [items] = await db.query(
    `SELECT * FROM ${qid(config.itemsTable)} WHERE ${qid(config.itemsFk)} = ? ORDER BY id ASC`,
    [id]
  );

  return { ...normalizeOrderRow(orderRows[0], String(source).toLowerCase()), items };
}

async function updateStatus(source, id, { status, waybill_id, tracking_number } = {}) {
  const config = getSourceConfig(source);
  const model = createGenericModel(config.table);

  const payload = {};
  if (status !== undefined) payload.order_status = status;
  if (waybill_id !== undefined) payload.waybill_id = waybill_id;
  if (tracking_number !== undefined) payload.tracking_number = tracking_number;

  return model.update(id, payload);
}

async function getFilterOptions() {
  const [accountRows] = await db.query(
    `SELECT DISTINCT account_name FROM orders WHERE account_name IS NOT NULL AND account_name <> ''
     UNION SELECT DISTINCT account_name FROM daraz_orders WHERE account_name IS NOT NULL AND account_name <> ''
     UNION SELECT DISTINCT account_name FROM woo_orders WHERE account_name IS NOT NULL AND account_name <> ''`
  );

  const paymentRows = await db
    .query(
      `SELECT DISTINCT payment_method FROM orders WHERE payment_method IS NOT NULL AND payment_method <> ''`
    )
    .then(([rows]) => rows)
    .catch(() => []);

  return {
    accounts: accountRows.map((row) => row.account_name).filter(Boolean),
    payment_methods: paymentRows.map((row) => row.payment_method).filter(Boolean),
  };
}

// Manual order numbers use the account's short code (e.g. BrightHub -> BH)
// plus a zero-padded running number — BH0001, BH0002, ...
function accountPrefix(accountName = "") {
  const initials = String(accountName)
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return initials.slice(0, 3) || "MO";
}

async function nextManualOrderNo(accountName) {
  const prefix = accountPrefix(accountName);

  const [rows] = await db.query(
    "SELECT order_no FROM orders WHERE order_no LIKE ? ORDER BY id DESC LIMIT 1",
    [`${prefix}%`]
  );

  const lastNo = rows[0]?.order_no || "";
  const lastNumber = Number(String(lastNo).replace(prefix, "")) || 0;
  const nextNumber = lastNumber + 1;

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

async function createManualOrder(payload = {}) {
  const {
    account_name,
    order_date,
    source_type,
    customer,
    shipping,
    items = [],
    currency,
    discount_total,
    shipping_fee,
    tax_percentage,
    payment_method,
    customer_note,
    totals = {},
    created_by,
  } = payload;

  if (!items.length) {
    throw new Error("At least one order item is required.");
  }

  const orderNo = await nextManualOrderNo(account_name);

  const orderModel = createGenericModel("orders");
  const itemModel = createGenericModel("order_items");
  const customerModel = createGenericModel("customers");

  let customerId = null;

  if (customer?.phone_1) {
    const [existingRows] = await db.query(
      "SELECT id FROM customers WHERE phone = ? LIMIT 1",
      [customer.phone_1]
    );

    if (existingRows.length) {
      customerId = existingRows[0].id;
    } else {
      const created = await customerModel.create({
        customer_name: customer.customer_name,
        phone: customer.phone_1,
        phone_alt: customer.phone_2,
        email: customer.email,
        shipping_full_name: customer.customer_name,
        shipping_address_line: shipping?.shipping_address_line1,
        shipping_city: shipping?.shipping_city,
        shipping_district: shipping?.shipping_district,
        shipping_province: shipping?.shipping_province,
        shipping_postal_code: shipping?.shipping_postal_code,
        shipping_country: shipping?.shipping_country,
        shipping_phone: customer.phone_1,
        source_type: source_type || "MANUAL",
        status: "active",
        created_by,
      });

      customerId = created?.id || null;
    }
  }

  const order = await orderModel.create({
    order_no: orderNo,
    account_name,
    order_date,
    source_type,
    customer_id: customerId,
    customer_name: customer?.customer_name,
    shipping_address_line1: shipping?.shipping_address_line1,
    shipping_address_line2: shipping?.shipping_address_line2,
    shipping_city: shipping?.shipping_city,
    shipping_district: shipping?.shipping_district,
    shipping_province: shipping?.shipping_province,
    shipping_postal_code: shipping?.shipping_postal_code,
    shipping_country: shipping?.shipping_country,
    currency: currency || "LKR",
    discount_total: discount_total || 0,
    shipping_fee: shipping_fee || 0,
    tax_percentage: tax_percentage || 0,
    item_total: totals.item_total || 0,
    tax_total: totals.tax_total || 0,
    grand_total: totals.order_total || 0,
    payment_method,
    customer_note,
    order_status: "pending",
    created_by,
  });

  await Promise.all(
    items.map((item) =>
      itemModel.create({
        order_id: order.id,
        sku: item.sku,
        local_sku: item.sku,
        product_title: item.product_title,
        qty: item.qty,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount,
        line_total:
          Number(item.qty || 0) * Number(item.unit_price || 0) - Number(item.discount_amount || 0),
        product_id: item.product_id,
        variant_id: item.variant_id,
        item_status: "pending",
      })
    )
  );

  return findByIdWithItems(order.id);
}

module.exports = {
  ...base,
  findByIdWithItems,
  listUnified,
  getUnified,
  updateStatus,
  getFilterOptions,
  createManualOrder,
  isCountableStatus,
};

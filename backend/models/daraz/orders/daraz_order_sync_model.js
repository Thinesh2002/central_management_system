const db = require("../../../config/product_management_db");

const safeJsonStringify = (data, fallback = "{}") => {
  try {
    if (data === undefined || data === null) return fallback;
    return JSON.stringify(data);
  } catch {
    return fallback;
  }
};

const normalizeOrderId = (value) => value || null;

exports.upsertOrder = async (account, order = {}) => {
  const orderId = normalizeOrderId(order.order_id || order.OrderId || order.orderNumber || order.order_number);
  if (!account?.account_code || !orderId) throw new Error("account_code and order_id are required");

  const payload = {
    account_id: account.id || null,
    account_code: account.account_code,
    account_name: account.account_name || null,
    order_id: orderId,
    order_number: order.order_number || order.OrderNumber || orderId,
    order_status: order.status || order.order_status || order.Status || null,
    fulfillment_type: order.fulfillment_type || order.FulfillmentType || null,
    payment_method: order.payment_method || order.PaymentMethod || null,
    currency: order.currency || order.Currency || null,
    customer_first_name: order.customer_first_name || order.CustomerFirstName || null,
    customer_last_name: order.customer_last_name || order.CustomerLastName || null,
    customer_email: order.customer_email || order.CustomerEmail || null,
    customer_phone: order.customer_phone || order.CustomerPhone || null,
    shipping_address_json: safeJsonStringify(order.shipping_address || order.ShippingAddress || {}, "{}"),
    billing_address_json: safeJsonStringify(order.billing_address || order.BillingAddress || {}, "{}"),
    order_total: order.order_total ?? order.price ?? order.Price ?? null,
    shipping_fee: order.shipping_fee ?? order.ShippingFee ?? null,
    voucher_amount: order.voucher_amount ?? order.VoucherAmount ?? null,
    commission_amount: order.commission_amount ?? order.CommissionAmount ?? null,
    tracking_code: order.tracking_code || order.TrackingCode || null,
    shipping_provider: order.shipping_provider || order.ShippingProvider || null,
    package_id: order.package_id || order.PackageId || null,
    daraz_created_at: order.created_at || order.created_at_date || order.CreatedAt || order.created_at || null,
    daraz_updated_at: order.updated_at || order.UpdatedAt || null,
    last_synced_at: new Date(),
    raw_json: safeJsonStringify(order)
  };

  const columns = Object.keys(payload);
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((column) => !["account_code", "order_id", "created_at"].includes(column))
    .map((column) => `${column} = VALUES(${column})`)
    .join(", ");

  await db.query(
    `INSERT INTO daraz_orders (${columns.join(", ")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
    Object.values(payload)
  );

  const [rows] = await db.query(
    `SELECT id FROM daraz_orders WHERE account_code = ? AND order_id = ? LIMIT 1`,
    [account.account_code, orderId]
  );

  return rows[0]?.id || null;
};

exports.upsertOrderItems = async (orderDbId, account, orderId, items = []) => {
  if (!orderDbId || !account?.account_code || !orderId) throw new Error("order context is required");
  if (!Array.isArray(items) || items.length === 0) return 0;

  let synced = 0;

  for (const item of items) {
    const orderItemId = item.order_item_id || item.OrderItemId || item.orderItemId || item.id;
    if (!orderItemId) continue;

    const payload = {
      order_db_id: orderDbId,
      account_id: account.id || null,
      account_code: account.account_code,
      order_id: orderId,
      order_item_id: orderItemId,
      item_id: item.item_id || item.ItemId || null,
      sku_id: item.sku_id || item.SkuId || null,
      seller_sku: item.seller_sku || item.SellerSku || null,
      shop_sku: item.shop_sku || item.ShopSku || null,
      product_name: item.name || item.product_name || item.ProductName || null,
      variation: item.variation || item.Variation || null,
      item_status: item.status || item.item_status || item.Status || null,
      quantity: item.quantity || item.Quantity || 1,
      unit_price: item.unit_price ?? item.UnitPrice ?? null,
      paid_price: item.paid_price ?? item.PaidPrice ?? item.item_price ?? null,
      shipping_fee: item.shipping_fee ?? item.ShippingFee ?? null,
      voucher_amount: item.voucher_amount ?? item.VoucherAmount ?? null,
      commission_amount: item.commission_amount ?? item.CommissionAmount ?? null,
      tracking_code: item.tracking_code || item.TrackingCode || null,
      shipping_provider: item.shipping_provider || item.ShippingProvider || null,
      package_id: item.package_id || item.PackageId || null,
      raw_json: safeJsonStringify(item)
    };

    const columns = Object.keys(payload);
    const placeholders = columns.map(() => "?").join(", ");
    const updates = columns
      .filter((column) => !["account_code", "order_item_id", "created_at"].includes(column))
      .map((column) => `${column} = VALUES(${column})`)
      .join(", ");

    await db.query(
      `INSERT INTO daraz_order_items (${columns.join(", ")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
      Object.values(payload)
    );

    synced += 1;
  }

  return synced;
};

exports.getOrders = async ({ page = 1, limit = 50, account_code = null, status = null, search = null } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const where = [];
  const params = [];

  if (account_code) {
    where.push("account_code = ?");
    params.push(account_code);
  }

  if (status) {
    where.push("order_status = ?");
    params.push(status);
  }

  if (search) {
    where.push("(CAST(order_id AS CHAR) LIKE ? OR order_number LIKE ? OR customer_first_name LIKE ? OR customer_phone LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM daraz_orders ${whereSql}`, params);
  const [orders] = await db.query(
    `SELECT * FROM daraz_orders ${whereSql} ORDER BY daraz_created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return { page: safePage, limit: safeLimit, total: Number(countRows[0]?.total || 0), orders };
};

exports.getOrderById = async (id) => {
  const [rows] = await db.query(`SELECT * FROM daraz_orders WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

exports.getOrderItems = async (orderDbId) => {
  const [rows] = await db.query(`SELECT * FROM daraz_order_items WHERE order_db_id = ? ORDER BY id ASC`, [orderDbId]);
  return rows;
};

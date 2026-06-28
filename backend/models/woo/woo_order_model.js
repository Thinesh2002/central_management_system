const db = require('../../config/marketplace_management_db/cm_marketplace_management');
const productDb = require('../../config/product_management_db/product_management_db');
const stockService = require('../../services/inventory/marketplace_stock_service');
const { listParams, toMoney, clean, jsonValue } = require('../../utils/business/query_helpers');

async function getCostByLocalSku(localSku) {
  if (!localSku) return 0;
  const [rows] = await productDb.query('SELECT cost_price FROM product_inventory WHERE sku = ? LIMIT 1', [localSku]);
  return toMoney(rows[0]?.cost_price || 0, 0);
}

async function list(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 500);
  const values = [];
  const where = [];
  if (params.account_id) { where.push('account_id = ?'); values.push(params.account_id); }
  if (params.account_code) { where.push('account_code = ?'); values.push(params.account_code); }
  if (params.status) { where.push('status = ?'); values.push(params.status); }
  if (params.payment_status) { where.push('payment_status = ?'); values.push(params.payment_status); }
  if (params.date_from) { where.push('order_date >= ?'); values.push(params.date_from); }
  if (params.date_to) { where.push('order_date < DATE_ADD(?, INTERVAL 1 DAY)'); values.push(params.date_to); }
  if (params.search) { where.push('(order_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)'); values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(`SELECT * FROM woo_orders ${whereSql} ORDER BY order_date DESC, id DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
  const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM woo_orders ${whereSql}`, values);
  return { rows, pagination: { page, limit, offset, total: Number(countRow.total || 0) } };
}

async function getById(id) {
  const [orders] = await db.query('SELECT * FROM woo_orders WHERE id = ? OR woo_order_id = ? OR order_number = ? LIMIT 1', [id, id, id]);
  const order = orders[0] || null;
  if (!order) return null;
  const [items] = await db.query('SELECT * FROM woo_order_items WHERE woo_order_id = ? ORDER BY id ASC', [order.woo_order_id]);
  return { ...order, items, line_items: items };
}

function getCustomerName(order = {}) {
  const billing = order.billing || {};
  const first = billing.first_name || order.customer_first_name || '';
  const last = billing.last_name || order.customer_last_name || '';
  return clean(`${first} ${last}`) || order.customer_name || '-';
}

async function upsertOrder(account = {}, order = {}) {
  const wooOrderId = String(order.id || order.woo_order_id || order.order_id || '');
  if (!wooOrderId) return null;

  const total = toMoney(order.total || order.order_total || 0, 0);
  const discount = toMoney(order.discount_total || order.discount_amount || 0, 0);
  const shipping = toMoney(order.shipping_total || order.shipping_cost || 0, 0);
  const refund = toMoney(order.refund_total || order.refunds_total || 0, 0);
  const netSales = Math.max(total - discount - refund, 0);

  await db.query(
    `INSERT INTO woo_orders
      (account_id, account_code, woo_order_id, order_number, order_date, status, local_status, currency,
       customer_name, customer_email, customer_phone, payment_method, payment_status, shipping_status,
       gross_sales, discount_amount, refund_amount, shipping_total, net_sales, raw_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       order_number=VALUES(order_number), order_date=VALUES(order_date), status=VALUES(status), local_status=VALUES(local_status), currency=VALUES(currency),
       customer_name=VALUES(customer_name), customer_email=VALUES(customer_email), customer_phone=VALUES(customer_phone), payment_method=VALUES(payment_method),
       payment_status=VALUES(payment_status), shipping_status=VALUES(shipping_status), gross_sales=VALUES(gross_sales), discount_amount=VALUES(discount_amount),
       refund_amount=VALUES(refund_amount), shipping_total=VALUES(shipping_total), net_sales=VALUES(net_sales), raw_json=VALUES(raw_json), updated_at=NOW()`,
    [account.account_id || account.id || null, account.account_code || null, wooOrderId, order.number || wooOrderId, order.date_created || order.created_at || new Date(), order.status || 'pending', order.status || 'pending', order.currency || 'LKR', getCustomerName(order), order.billing?.email || order.customer_email || '', order.billing?.phone || order.customer_phone || '', order.payment_method_title || order.payment_method || '', order.status === 'completed' || order.status === 'processing' ? 'paid' : 'pending', order.shipping_status || '', total, discount, refund, shipping, netSales, jsonValue(order)]
  );

  const lineItems = Array.isArray(order.line_items) ? order.line_items : [];
  const savedItems = [];

  for (const item of lineItems) {
    const marketplaceSku = clean(item.sku || item.seller_sku || item.name);
    const localSku = await stockService.findMappedSku({
      platform: 'WOO',
      accountId: account.account_id || account.id || null,
      accountCode: account.account_code || null,
      marketplaceSku,
    }) || marketplaceSku;
    const qty = Number(item.quantity || 1);
    const costPrice = await getCostByLocalSku(localSku);
    const productCost = costPrice * qty;
    const itemTotal = toMoney(item.total || 0, 0);
    const wooOrderItemId = String(item.id || `${wooOrderId}-${marketplaceSku}`);

    await db.query(
      `INSERT INTO woo_order_items
        (woo_order_id, woo_order_item_id, product_id, variation_id, sku, local_sku, product_name, quantity, unit_price, item_total, product_cost, raw_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
        sku=VALUES(sku), local_sku=VALUES(local_sku), product_name=VALUES(product_name), quantity=VALUES(quantity), unit_price=VALUES(unit_price),
        item_total=VALUES(item_total), product_cost=VALUES(product_cost), raw_json=VALUES(raw_json), updated_at=NOW()`,
      [wooOrderId, wooOrderItemId, item.product_id || null, item.variation_id || null, marketplaceSku, localSku, item.name || '-', qty, qty ? itemTotal / qty : itemTotal, itemTotal, productCost, jsonValue(item)]
    );

    savedItems.push({
      marketplace_order_item_id: wooOrderItemId,
      marketplace_sku: marketplaceSku,
      local_sku: localSku,
      quantity: qty,
      product_name: item.name || '-',
      raw_json: item,
    });
  }

  if (savedItems.length) {
    await stockService.deductStockForOrderItems(
      {
        platform: 'WOO',
        account_id: account.account_id || account.id || null,
        account_code: account.account_code || null,
        marketplace_order_id: wooOrderId,
      },
      savedItems
    );
  }

  const saved = await getById(wooOrderId);
  return saved;
}

async function updateStatus(id, status) {
  await db.query('UPDATE woo_orders SET status = ?, local_status = ?, updated_at = NOW() WHERE id = ? OR woo_order_id = ? OR order_number = ?', [status, status, id, id, id]);
  return getById(id);
}

async function financeSummary(params = {}) {
  const values = [];
  const where = [];
  if (params.account_id) { where.push('account_id = ?'); values.push(params.account_id); }
  if (params.date_from) { where.push('order_date >= ?'); values.push(params.date_from); }
  if (params.date_to) { where.push('order_date < DATE_ADD(?, INTERVAL 1 DAY)'); values.push(params.date_to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total_orders,
            COALESCE(SUM(gross_sales), 0) AS gross_sales,
            COALESCE(SUM(discount_amount), 0) AS discounts,
            COALESCE(SUM(refund_amount), 0) AS refunds,
            COALESCE(SUM(net_sales), 0) AS net_sales,
            COALESCE(SUM(shipping_total), 0) AS shipping_total
     FROM woo_orders ${whereSql}`,
    values
  );
  return row;
}

module.exports = { list, getById, upsertOrder, updateStatus, financeSummary };

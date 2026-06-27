const productDb = require('../../config/product_management_db/product_management_db');
const orderDb = require('../../config/order_management_db/cm_order_management');
const marketplaceDb = require('../../config/marketplace_management_db/cm_marketplace_management');
const { listParams, toMoney, toInt, clean, jsonValue } = require('../../utils/business/query_helpers');

const metaCache = new WeakMap();
const tableCache = new WeakMap();

function todaySql() {
  return new Date().toISOString().slice(0, 10);
}

function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

function normalizeSku(value) {
  return clean(value).toUpperCase();
}

function money(value) {
  return toMoney(value, 0);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dateSql(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function startDate(daysBack) {
  return dateSql(addDays(new Date(), -Number(daysBack || 0)));
}

function emptyPagination(page, limit, offset, total = 0) {
  return { page, limit, offset, total: Number(total || 0), total_pages: Math.ceil(Number(total || 0) / limit) };
}

function calcPrice(row = {}) {
  const selling = money(row.current_price ?? row.selling_price ?? row.price);
  const buyerShipping = money(row.shipping_paid_by_buyer);
  const marketplaceFee = money(row.marketplace_fee ?? row.fees);
  const paymentFee = money(row.payment_fee);
  const promotion = money(row.promotion_cost ?? row.promotion_discount);
  const ppc = money(row.ppc_cost);
  const courier = money(row.courier_cost);
  const packaging = money(row.packaging_cost);
  const refund = money(row.refund_amount);
  const productCost = money(row.product_cost || row.cost_price);
  const targetMargin = money(row.target_margin_percent || 20);

  const netSales = money(selling + buyerShipping - marketplaceFee - paymentFee - promotion - ppc - courier - packaging - refund);
  const profit = money(netSales - productCost);
  const margin = selling > 0 ? money((profit / selling) * 100) : 0;
  const breakEven = money(productCost + marketplaceFee + paymentFee + promotion + ppc + courier + packaging + refund);
  const suggestedPrice = money(breakEven / Math.max(1 - targetMargin / 100, 0.01));
  const status = profit < 0 ? 'loss' : margin < targetMargin ? 'low_margin' : 'good';

  return { net_sales: netSales, profit_amount: profit, margin_percent: margin, break_even_price: breakEven, suggested_price: suggestedPrice, status };
}

function dbName(db) {
  return db?.config?.connectionConfig?.database || db?.config?.database || 'default';
}

async function tableExists(db, tableName) {
  let cache = tableCache.get(db);
  if (!cache) {
    cache = new Map();
    tableCache.set(db, cache);
  }
  if (cache.has(tableName)) return cache.get(tableName);
  try {
    const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
    const exists = rows.length > 0;
    cache.set(tableName, exists);
    return exists;
  } catch {
    cache.set(tableName, false);
    return false;
  }
}

async function getMeta(db, tableName) {
  let cache = metaCache.get(db);
  if (!cache) {
    cache = new Map();
    metaCache.set(db, cache);
  }
  if (cache.has(tableName)) return cache.get(tableName);

  const exists = await tableExists(db, tableName);
  if (!exists) {
    const meta = { exists: false, tableName, columns: [], columnSet: new Set(), primaryKey: 'id' };
    cache.set(tableName, meta);
    return meta;
  }

  const [rows] = await db.query(`SHOW COLUMNS FROM ${qid(tableName)}`);
  const meta = {
    exists: true,
    tableName,
    columns: rows.map((row) => ({ name: row.Field, type: String(row.Type || '').toLowerCase(), key: row.Key })),
    columnSet: new Set(rows.map((row) => row.Field)),
    primaryKey: rows.find((row) => row.Key === 'PRI')?.Field || 'id',
  };
  cache.set(tableName, meta);
  return meta;
}

function has(meta, columnName) {
  return Boolean(meta?.columnSet?.has(columnName));
}

function firstColumn(meta, candidates = []) {
  return candidates.find((column) => has(meta, column)) || null;
}

function selectExpr(meta, candidates, alias, fallback = 'NULL') {
  const column = firstColumn(meta, candidates);
  return column ? `${qid(column)} AS ${qid(alias)}` : `${fallback} AS ${qid(alias)}`;
}

async function safeQuery(db, sql, params = [], fallback = []) {
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (error) {
    if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR', 'ER_PARSE_ERROR', 'ER_SP_DOES_NOT_EXIST'].includes(error.code)) return fallback;
    throw error;
  }
}

async function safeOne(db, sql, params = [], fallback = {}) {
  const rows = await safeQuery(db, sql, params, []);
  return rows[0] || fallback;
}

async function getSkuMappingMap(platforms = ['DARAZ', 'WOO']) {
  const exists = await tableExists(marketplaceDb, 'marketplace_sku_mappings');
  if (!exists) return new Map();

  const rows = await safeQuery(
    marketplaceDb,
    `SELECT platform, marketplace_sku, local_sku, account_id, account_code
     FROM marketplace_sku_mappings
     WHERE platform IN (${platforms.map(() => '?').join(',')})`,
    platforms,
    []
  );

  const map = new Map();
  rows.forEach((row) => {
    const platform = String(row.platform || '').toUpperCase();
    const marketplaceSku = normalizeSku(row.marketplace_sku);
    const localSku = normalizeSku(row.local_sku);
    if (!platform || !marketplaceSku || !localSku) return;
    map.set(`${platform}:${marketplaceSku}:${row.account_id || ''}`, localSku);
    map.set(`${platform}:${marketplaceSku}:${row.account_code || ''}`, localSku);
    map.set(`${platform}:${marketplaceSku}`, localSku);
  });
  return map;
}

function mapSku(mapping, platform, rawSku, accountId, accountCode) {
  const normalized = normalizeSku(rawSku);
  if (!normalized) return '';
  const upperPlatform = String(platform || '').toUpperCase();
  return (
    mapping.get(`${upperPlatform}:${normalized}:${accountId || ''}`) ||
    mapping.get(`${upperPlatform}:${normalized}:${accountCode || ''}`) ||
    mapping.get(`${upperPlatform}:${normalized}`) ||
    normalized
  );
}

async function getInventoryRows() {
  const meta = await getMeta(productDb, 'product_inventory');
  if (!meta.exists) return [];

  const id = selectExpr(meta, ['id', 'inventory_id'], 'id', 'NULL');
  const sku = selectExpr(meta, ['sku', 'local_sku', 'product_sku', 'seller_sku', 'variant_sku'], 'local_sku', "''");
  const productName = selectExpr(meta, ['product_name', 'name', 'title'], 'product_name', 'NULL');
  const stock = selectExpr(meta, ['stock_qty', 'qty', 'quantity', 'stock'], 'stock_qty', '0');
  const reserved = selectExpr(meta, ['reserved_qty', 'reserved_stock'], 'reserved_qty', '0');
  const availableColumn = firstColumn(meta, ['available_qty', 'available_stock']);
  const stockColumn = firstColumn(meta, ['stock_qty', 'qty', 'quantity', 'stock']);
  const reservedColumn = firstColumn(meta, ['reserved_qty', 'reserved_stock']);
  const available = availableColumn
    ? `${qid(availableColumn)} AS available_stock`
    : stockColumn
      ? `GREATEST(COALESCE(${qid(stockColumn)},0) - ${reservedColumn ? `COALESCE(${qid(reservedColumn)},0)` : '0'}, 0) AS available_stock`
      : `0 AS available_stock`;
  const low = selectExpr(meta, ['low_stock_alert_qty', 'low_stock_qty', 'alert_qty'], 'low_stock_alert_qty', '5');
  const cost = selectExpr(meta, ['cost_price', 'product_cost', 'unit_cost'], 'cost_price', '0');
  const updated = selectExpr(meta, ['updated_at', 'created_at'], 'updated_at', 'NULL');

  return safeQuery(
    productDb,
    `SELECT ${id}, ${sku}, ${productName}, ${stock}, ${reserved}, ${available}, ${low}, ${cost}, ${updated}
     FROM product_inventory
     ORDER BY ${qid(firstColumn(meta, ['updated_at', 'created_at', meta.primaryKey]) || meta.primaryKey)} DESC`,
    [],
    []
  );
}

async function getInventorySummary() {
  const rows = await getInventoryRows();
  return rows.reduce(
    (acc, row) => {
      const stock = toInt(row.stock_qty, 0);
      const reserved = toInt(row.reserved_qty, 0);
      const available = row.available_stock !== undefined ? toInt(row.available_stock, 0) : Math.max(stock - reserved, 0);
      const low = toInt(row.low_stock_alert_qty, 5);
      const cost = money(row.cost_price);
      acc.total_skus += row.local_sku ? 1 : 0;
      acc.total_stock += stock;
      acc.reserved_stock += reserved;
      acc.available_stock += available;
      acc.stock_value += available * cost;
      if (available <= 0) acc.out_of_stock_count += 1;
      else if (available <= low) acc.low_stock_count += 1;
      return acc;
    },
    { total_skus: 0, total_stock: 0, reserved_stock: 0, available_stock: 0, stock_value: 0, low_stock_count: 0, out_of_stock_count: 0 }
  );
}

function mergeAgg(target, key, patch) {
  if (!key) return;
  if (!target[key]) {
    target[key] = {
      local_sku: key,
      product_name: '',
      stock_qty: 0,
      reserved_qty: 0,
      available_stock: 0,
      low_stock_alert_qty: 5,
      cost_price: 0,
      sales_7_days: 0,
      sales_30_days: 0,
      sales_60_days: 0,
      sales_90_days: 0,
      orders_30_days: 0,
      revenue_30_days: 0,
      revenue_90_days: 0,
      daraz_sales_30_days: 0,
      woo_sales_30_days: 0,
      manual_sales_30_days: 0,
      pending_orders: 0,
      last_order_at: null,
    };
  }
  Object.entries(patch).forEach(([field, value]) => {
    if (typeof value === 'number') target[key][field] = Number(target[key][field] || 0) + value;
    else if (value !== undefined && value !== null && value !== '') target[key][field] = value;
  });
}

async function getDarazItemRows(days = 90) {
  const orderMeta = await getMeta(orderDb, 'daraz_orders');
  const itemMeta = await getMeta(orderDb, 'daraz_order_items');
  if (!orderMeta.exists || !itemMeta.exists) return [];

  const orderDate = firstColumn(orderMeta, ['order_created_at', 'created_at', 'created_time', 'paid_at']) || 'created_at';
  const total = firstColumn(itemMeta, ['total_amount', 'paid_price', 'unit_price']) || 'total_amount';
  const qty = firstColumn(itemMeta, ['quantity', 'qty']) || 'quantity';
  const sku = firstColumn(itemMeta, ['seller_sku', 'shop_sku', 'sku']) || 'sku';
  const name = firstColumn(itemMeta, ['product_name', 'name', 'item_name']) || null;
  const statusExpr = `LOWER(CONCAT_WS(' ', o.${qid(firstColumn(orderMeta, ['local_status', 'daraz_status', 'status']) || 'local_status')}, o.${qid(firstColumn(orderMeta, ['daraz_status', 'status', 'local_status']) || 'daraz_status')}, i.${qid(firstColumn(itemMeta, ['local_item_status', 'item_status', 'status']) || 'item_status')}))`;
  const accountId = firstColumn(orderMeta, ['account_id']);
  const accountCode = firstColumn(orderMeta, ['account_code']);

  return safeQuery(
    orderDb,
    `SELECT
       ${sku ? `i.${qid(sku)}` : "''"} AS marketplace_sku,
       ${name ? `i.${qid(name)}` : 'NULL'} AS product_name,
       ${accountId ? `o.${qid(accountId)}` : 'NULL'} AS account_id,
       ${accountCode ? `o.${qid(accountCode)}` : 'NULL'} AS account_code,
       DATE(o.${qid(orderDate)}) AS sales_date,
       COALESCE(i.${qid(qty)}, 1) AS qty,
       COALESCE(i.${qid(total)}, 0) AS amount,
       ${statusExpr} AS status_text,
       o.${qid(orderDate)} AS order_date
     FROM daraz_order_items i
     INNER JOIN daraz_orders o ON o.id = i.order_id
     WHERE o.${qid(orderDate)} >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [days],
    []
  );
}

async function getWooItemRows(days = 90) {
  const orderMeta = await getMeta(marketplaceDb, 'woo_orders');
  const itemMeta = await getMeta(marketplaceDb, 'woo_order_items');
  if (!orderMeta.exists || !itemMeta.exists) return [];

  const orderDate = firstColumn(orderMeta, ['order_date', 'created_at', 'date_created']) || 'order_date';
  const orderId = firstColumn(orderMeta, ['woo_order_id', 'id']) || 'woo_order_id';
  const itemOrderId = firstColumn(itemMeta, ['woo_order_id', 'order_id']) || 'woo_order_id';
  const total = firstColumn(itemMeta, ['item_total', 'total', 'line_total', 'unit_price']) || 'item_total';
  const qty = firstColumn(itemMeta, ['quantity', 'qty']) || 'quantity';
  const sku = firstColumn(itemMeta, ['local_sku', 'sku', 'seller_sku']) || 'sku';
  const marketplaceSku = firstColumn(itemMeta, ['sku', 'seller_sku', 'local_sku']) || 'sku';
  const name = firstColumn(itemMeta, ['product_name', 'name']) || null;
  const status = firstColumn(orderMeta, ['local_status', 'status']) || 'status';
  const accountId = firstColumn(orderMeta, ['account_id']);
  const accountCode = firstColumn(orderMeta, ['account_code']);

  return safeQuery(
    marketplaceDb,
    `SELECT
       i.${qid(sku)} AS local_sku,
       i.${qid(marketplaceSku)} AS marketplace_sku,
       ${name ? `i.${qid(name)}` : 'NULL'} AS product_name,
       ${accountId ? `o.${qid(accountId)}` : 'NULL'} AS account_id,
       ${accountCode ? `o.${qid(accountCode)}` : 'NULL'} AS account_code,
       DATE(o.${qid(orderDate)}) AS sales_date,
       COALESCE(i.${qid(qty)}, 1) AS qty,
       COALESCE(i.${qid(total)}, 0) AS amount,
       LOWER(COALESCE(o.${qid(status)}, '')) AS status_text,
       o.${qid(orderDate)} AS order_date
     FROM woo_order_items i
     INNER JOIN woo_orders o ON CAST(o.${qid(orderId)} AS CHAR) = CAST(i.${qid(itemOrderId)} AS CHAR)
     WHERE o.${qid(orderDate)} >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [days],
    []
  );
}

function isDeliveredStatus(statusText) {
  const text = String(statusText || '').toLowerCase();
  if (text.includes('cancel') || text.includes('return') || text.includes('failed')) return false;
  return text.includes('deliver') || text.includes('completed') || text.includes('processing') || text.includes('shipped') || text.includes('ready');
}

function isPendingStatus(statusText) {
  const text = String(statusText || '').toLowerCase();
  if (text.includes('cancel') || text.includes('deliver') || text.includes('completed') || text.includes('return')) return false;
  return true;
}

async function buildSkuMetrics() {
  const metrics = {};
  const inventory = await getInventoryRows();
  inventory.forEach((row) => {
    const sku = normalizeSku(row.local_sku);
    mergeAgg(metrics, sku, {
      product_name: row.product_name || '',
      stock_qty: toInt(row.stock_qty, 0),
      reserved_qty: toInt(row.reserved_qty, 0),
      available_stock: toInt(row.available_stock, 0),
      low_stock_alert_qty: toInt(row.low_stock_alert_qty, 5),
      cost_price: money(row.cost_price),
    });
  });

  const mapping = await getSkuMappingMap(['DARAZ', 'WOO']);
  const today = new Date(todaySql());

  const addSale = (platform, row) => {
    const localSku = platform === 'WOO' && normalizeSku(row.local_sku)
      ? normalizeSku(row.local_sku)
      : mapSku(mapping, platform, row.marketplace_sku, row.account_id, row.account_code);
    if (!localSku) return;
    const qty = toInt(row.qty, 1);
    const amount = money(row.amount);
    const date = new Date(row.sales_date || row.order_date || todaySql());
    const age = Math.floor((today - date) / (24 * 60 * 60 * 1000));
    const patch = { product_name: row.product_name || undefined, last_order_at: row.order_date || row.sales_date };
    if (isPendingStatus(row.status_text)) patch.pending_orders = 1;
    if (age <= 90) {
      patch.sales_90_days = qty;
      patch.revenue_90_days = amount;
    }
    if (age <= 60) patch.sales_60_days = qty;
    if (age <= 30) {
      patch.sales_30_days = qty;
      patch.orders_30_days = 1;
      patch.revenue_30_days = amount;
      patch[`${String(platform).toLowerCase()}_sales_30_days`] = qty;
    }
    if (age <= 7) patch.sales_7_days = qty;
    mergeAgg(metrics, localSku, patch);
  };

  const [darazItems, wooItems] = await Promise.all([getDarazItemRows(90), getWooItemRows(90)]);
  darazItems.forEach((row) => addSale('DARAZ', row));
  wooItems.forEach((row) => addSale('WOO', row));

  return Object.values(metrics).sort((a, b) => Number(b.sales_30_days || 0) - Number(a.sales_30_days || 0));
}

async function getDirectOrderSummary() {
  const today = todaySql();
  const since30 = startDate(30);
  const since90 = startDate(90);

  const darazMeta = await getMeta(orderDb, 'daraz_orders');
  let daraz = { today_sales: 0, last_30_days_sales: 0, last_90_days_sales: 0, delivered_30_days_sales: 0, today_orders: 0, new_orders_24h: 0 };
  if (darazMeta.exists) {
    const date = firstColumn(darazMeta, ['order_created_at', 'created_at', 'paid_at']) || 'created_at';
    const total = firstColumn(darazMeta, ['total_amount', 'subtotal']) || 'total_amount';
    const status = `LOWER(CONCAT_WS(' ', ${firstColumn(darazMeta, ['local_status']) ? qid(firstColumn(darazMeta, ['local_status'])) : "''"}, ${firstColumn(darazMeta, ['daraz_status', 'status']) ? qid(firstColumn(darazMeta, ['daraz_status', 'status'])) : "''"}))`;
    daraz = await safeOne(
      orderDb,
      `SELECT
         COALESCE(SUM(CASE WHEN DATE(${qid(date)}) = ? THEN ${qid(total)} ELSE 0 END),0) AS today_sales,
         COALESCE(SUM(CASE WHEN DATE(${qid(date)}) >= ? THEN ${qid(total)} ELSE 0 END),0) AS last_30_days_sales,
         COALESCE(SUM(CASE WHEN DATE(${qid(date)}) >= ? THEN ${qid(total)} ELSE 0 END),0) AS last_90_days_sales,
         COALESCE(SUM(CASE WHEN DATE(${qid(date)}) >= ? AND ${status} LIKE '%deliver%' THEN ${qid(total)} ELSE 0 END),0) AS delivered_30_days_sales,
         COALESCE(SUM(CASE WHEN DATE(${qid(date)}) = ? THEN 1 ELSE 0 END),0) AS today_orders,
         COALESCE(SUM(CASE WHEN ${qid(date)} >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND ${status} NOT LIKE '%deliver%' AND ${status} NOT LIKE '%cancel%' THEN 1 ELSE 0 END),0) AS new_orders_24h
       FROM daraz_orders`,
      [today, since30, since90, since30, today],
      daraz
    );
  }

  const wooMeta = await getMeta(marketplaceDb, 'woo_orders');
  let woo = { today_sales: 0, last_30_days_sales: 0, last_90_days_sales: 0, delivered_30_days_sales: 0, today_orders: 0, new_orders_24h: 0 };
  if (wooMeta.exists) {
    const date = firstColumn(wooMeta, ['order_date', 'created_at', 'date_created']) || 'order_date';
    const total = firstColumn(wooMeta, ['net_sales', 'gross_sales', 'total_amount']) || 'net_sales';
    const statusColumn = firstColumn(wooMeta, ['local_status', 'status']);
    const status = statusColumn ? `LOWER(${qid(statusColumn)})` : "''";
    woo = await safeOne(
      marketplaceDb,
      `SELECT
         COALESCE(SUM(CASE WHEN DATE(${qid(date)}) = ? THEN ${qid(total)} ELSE 0 END),0) AS today_sales,
         COALESCE(SUM(CASE WHEN DATE(${qid(date)}) >= ? THEN ${qid(total)} ELSE 0 END),0) AS last_30_days_sales,
         COALESCE(SUM(CASE WHEN DATE(${qid(date)}) >= ? THEN ${qid(total)} ELSE 0 END),0) AS last_90_days_sales,
         COALESCE(SUM(CASE WHEN DATE(${qid(date)}) >= ? AND (${status} LIKE '%complete%' OR ${status} LIKE '%processing%') THEN ${qid(total)} ELSE 0 END),0) AS delivered_30_days_sales,
         COALESCE(SUM(CASE WHEN DATE(${qid(date)}) = ? THEN 1 ELSE 0 END),0) AS today_orders,
         COALESCE(SUM(CASE WHEN ${qid(date)} >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND ${status} NOT LIKE '%complete%' AND ${status} NOT LIKE '%cancel%' THEN 1 ELSE 0 END),0) AS new_orders_24h
       FROM woo_orders`,
      [today, since30, since90, since30, today],
      woo
    );
  }

  return { daraz, woo };
}

async function getRecentOrderNotifications() {
  const notifications = [];
  const darazMeta = await getMeta(orderDb, 'daraz_orders');
  if (darazMeta.exists) {
    const date = firstColumn(darazMeta, ['order_created_at', 'created_at', 'paid_at']) || 'created_at';
    const orderNumber = firstColumn(darazMeta, ['order_number', 'order_id']) || 'id';
    const total = firstColumn(darazMeta, ['total_amount', 'subtotal']) || 'total_amount';
    const account = firstColumn(darazMeta, ['account_code']);
    const rows = await safeQuery(orderDb, `SELECT ${qid(orderNumber)} AS order_number, ${qid(total)} AS amount, ${account ? qid(account) : "''"} AS account_code, ${qid(date)} AS created_at FROM daraz_orders WHERE ${qid(date)} >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY ${qid(date)} DESC LIMIT 8`, [], []);
    rows.forEach((row) => notifications.push({ title: 'New Daraz order', message: `${row.account_code || 'Daraz'} order ${row.order_number} received - LKR ${Number(row.amount || 0).toLocaleString()}`, type: 'info', module_name: 'daraz_orders', created_at: row.created_at }));
  }
  const wooMeta = await getMeta(marketplaceDb, 'woo_orders');
  if (wooMeta.exists) {
    const date = firstColumn(wooMeta, ['order_date', 'created_at']) || 'order_date';
    const orderNumber = firstColumn(wooMeta, ['order_number', 'woo_order_id']) || 'id';
    const total = firstColumn(wooMeta, ['net_sales', 'gross_sales']) || 'net_sales';
    const account = firstColumn(wooMeta, ['account_code']);
    const rows = await safeQuery(marketplaceDb, `SELECT ${qid(orderNumber)} AS order_number, ${qid(total)} AS amount, ${account ? qid(account) : "''"} AS account_code, ${qid(date)} AS created_at FROM woo_orders WHERE ${qid(date)} >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY ${qid(date)} DESC LIMIT 8`, [], []);
    rows.forEach((row) => notifications.push({ title: 'New Woo order', message: `${row.account_code || 'Woo'} order ${row.order_number} received - LKR ${Number(row.amount || 0).toLocaleString()}`, type: 'info', module_name: 'woo_orders', created_at: row.created_at }));
  }
  const dbNotifications = await safeQuery(productDb, `SELECT id, title, message, type, module_name, created_at FROM notifications WHERE is_read = 0 ORDER BY created_at DESC LIMIT 8`, [], []);
  return [...notifications, ...dbNotifications].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 12);
}

async function getDailySalesRows() {
  const map = new Map();
  for (let i = 29; i >= 0; i -= 1) {
    const d = startDate(i);
    map.set(d, { sales_date: d, daraz_sales: 0, woo_sales: 0, gross_sales: 0, net_sales: 0, order_count: 0 });
  }

  const darazMeta = await getMeta(orderDb, 'daraz_orders');
  if (darazMeta.exists) {
    const date = firstColumn(darazMeta, ['order_created_at', 'created_at', 'paid_at']) || 'created_at';
    const total = firstColumn(darazMeta, ['total_amount', 'subtotal']) || 'total_amount';
    const rows = await safeQuery(orderDb, `SELECT DATE(${qid(date)}) AS sales_date, COALESCE(SUM(${qid(total)}),0) AS amount, COUNT(*) AS order_count FROM daraz_orders WHERE ${qid(date)} >= DATE_SUB(CURDATE(), INTERVAL 29 DAY) GROUP BY DATE(${qid(date)})`, [], []);
    rows.forEach((row) => {
      const key = dateSql(row.sales_date);
      const item = map.get(key) || { sales_date: key, daraz_sales: 0, woo_sales: 0, gross_sales: 0, net_sales: 0, order_count: 0 };
      item.daraz_sales += money(row.amount);
      item.gross_sales += money(row.amount);
      item.net_sales += money(row.amount);
      item.order_count += toInt(row.order_count, 0);
      map.set(key, item);
    });
  }

  const wooMeta = await getMeta(marketplaceDb, 'woo_orders');
  if (wooMeta.exists) {
    const date = firstColumn(wooMeta, ['order_date', 'created_at']) || 'order_date';
    const total = firstColumn(wooMeta, ['net_sales', 'gross_sales']) || 'net_sales';
    const rows = await safeQuery(marketplaceDb, `SELECT DATE(${qid(date)}) AS sales_date, COALESCE(SUM(${qid(total)}),0) AS amount, COUNT(*) AS order_count FROM woo_orders WHERE ${qid(date)} >= DATE_SUB(CURDATE(), INTERVAL 29 DAY) GROUP BY DATE(${qid(date)})`, [], []);
    rows.forEach((row) => {
      const key = dateSql(row.sales_date);
      const item = map.get(key) || { sales_date: key, daraz_sales: 0, woo_sales: 0, gross_sales: 0, net_sales: 0, order_count: 0 };
      item.woo_sales += money(row.amount);
      item.gross_sales += money(row.amount);
      item.net_sales += money(row.amount);
      item.order_count += toInt(row.order_count, 0);
      map.set(key, item);
    });
  }
  return Array.from(map.values()).sort((a, b) => String(a.sales_date).localeCompare(String(b.sales_date)));
}

async function getBusinessDashboard(params = {}) {
  const direct = await getDirectOrderSummary();
  const inventory = await getInventorySummary();
  const sync = await safeOne(productDb, `SELECT COALESCE(SUM(success_count), 0) AS success_count, COALESCE(SUM(failed_count), 0) AS failed_count, COUNT(*) AS total_runs FROM sync_runs WHERE started_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`, [], { success_count: 0, failed_count: 0, total_runs: 0 });
  const dailySales = await getDailySalesRows();
  const notifications = await getRecentOrderNotifications();

  const summary = {
    today_sales: money(direct.daraz.today_sales) + money(direct.woo.today_sales),
    total_sales: money(direct.daraz.last_30_days_sales) + money(direct.woo.last_30_days_sales),
    net_sales: money(direct.daraz.delivered_30_days_sales) + money(direct.woo.delivered_30_days_sales),
    profit_amount: 0,
    order_count: toInt(direct.daraz.today_orders, 0) + toInt(direct.woo.today_orders, 0),
    new_orders_24h: toInt(direct.daraz.new_orders_24h, 0) + toInt(direct.woo.new_orders_24h, 0),
    daraz_today_sales: money(direct.daraz.today_sales),
    woo_today_sales: money(direct.woo.today_sales),
    daraz_30_days_sales: money(direct.daraz.last_30_days_sales),
    woo_30_days_sales: money(direct.woo.last_30_days_sales),
    delivered_30_days_sales: money(direct.daraz.delivered_30_days_sales) + money(direct.woo.delivered_30_days_sales),
    daraz_delivered_30_days_sales: money(direct.daraz.delivered_30_days_sales),
    woo_delivered_30_days_sales: money(direct.woo.delivered_30_days_sales),
  };

  return { summary, inventory, sync, daily_sales: dailySales, notifications, marketplace: direct };
}

async function getPriceDashboard(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 300);
  const exists = await tableExists(productDb, 'marketplace_listing_prices');
  if (!exists) return { rows: [], summary: { total_items: 0, total_net_sales: 0, total_profit: 0, loss_count: 0, low_margin_count: 0 }, pagination: emptyPagination(page, limit, offset, 0) };

  const values = [];
  const where = [];
  if (params.search) {
    where.push('(p.local_sku LIKE ? OR p.marketplace_sku LIKE ? OR l.title LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }
  if (params.marketplace) { where.push('p.marketplace = ?'); values.push(String(params.marketplace).toUpperCase()); }
  if (params.account_id) { where.push('p.account_id = ?'); values.push(params.account_id); }
  if (params.status) { where.push('p.status = ?'); values.push(params.status); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await safeQuery(productDb, `SELECT p.*, l.title, l.category_name, l.image_url, i.stock_qty, i.reserved_qty, i.low_stock_alert_qty, GREATEST(COALESCE(i.stock_qty,0) - COALESCE(i.reserved_qty,0), 0) AS available_stock FROM marketplace_listing_prices p LEFT JOIN marketplace_listings l ON l.id = p.listing_id LEFT JOIN product_inventory i ON i.sku = p.local_sku ${whereSql} ORDER BY p.updated_at DESC, p.id DESC LIMIT ? OFFSET ?`, [...values, limit, offset], []);
  const countRow = await safeOne(productDb, `SELECT COUNT(*) AS total FROM marketplace_listing_prices p LEFT JOIN marketplace_listings l ON l.id = p.listing_id ${whereSql}`, values, { total: 0 });
  const calculated = rows.map((row) => ({ ...row, ...calcPrice(row) }));
  const summary = calculated.reduce((acc, row) => {
    acc.total_items += 1;
    acc.total_net_sales += money(row.net_sales);
    acc.total_profit += money(row.profit_amount);
    acc.loss_count += row.status === 'loss' ? 1 : 0;
    acc.low_margin_count += row.status === 'low_margin' ? 1 : 0;
    return acc;
  }, { total_items: 0, total_net_sales: 0, total_profit: 0, loss_count: 0, low_margin_count: 0 });
  return { rows: calculated, summary, pagination: emptyPagination(page, limit, offset, countRow.total) };
}

async function recalculatePrices(userId = null) {
  const runUid = `price_calc_${Date.now()}`;
  const runExists = await tableExists(productDb, 'price_calculation_runs');
  let runId = null;
  if (runExists) {
    const [run] = await productDb.query(`INSERT INTO price_calculation_runs (run_uid, status, started_at) VALUES (?, 'running', NOW())`, [runUid]);
    runId = run.insertId;
  }
  let success = 0;
  let failed = 0;
  const { rows } = await getPriceDashboard({ limit: 500 });
  for (const row of rows) {
    try {
      const calc = calcPrice(row);
      await productDb.query(`UPDATE marketplace_listing_prices SET suggested_price = ?, profit_amount = ?, margin_percent = ?, status = ?, last_calculated_at = NOW() WHERE id = ?`, [calc.suggested_price, calc.profit_amount, calc.margin_percent, calc.status, row.id]);
      if (runId) await productDb.query(`INSERT INTO price_calculation_items (run_id, local_sku, marketplace, current_price, net_sales, total_cost, profit_amount, margin_percent, suggested_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [runId, row.local_sku, row.marketplace, row.current_price, calc.net_sales, calc.break_even_price, calc.profit_amount, calc.margin_percent, calc.suggested_price, calc.status]);
      success += 1;
    } catch (error) {
      failed += 1;
      if (runId) await productDb.query(`INSERT INTO price_calculation_items (run_id, local_sku, marketplace, status, error_message) VALUES (?, ?, ?, 'failed', ?)`, [runId, row.local_sku || '-', row.marketplace || 'LOCAL', error.message]);
    }
  }
  if (runId) await productDb.query(`UPDATE price_calculation_runs SET status = ?, total_items = ?, success_items = ?, failed_items = ?, finished_at = NOW(), note = ? WHERE id = ?`, [failed ? 'failed' : 'success', rows.length, success, failed, `Success: ${success} | Failed: ${failed}`, runId]);
  return { run_id: runId, run_uid: runUid, total_items: rows.length, success_items: success, failed_items: failed };
}

function resolveImageValue(row = {}) {
  return row.image_url || row.url || row.image_path || row.path || row.file_url || row.file_path || row.src || '';
}

async function readProductImageRows() {
  const imageMeta = await getMeta(productDb, 'product_images');
  if (!imageMeta.exists) return [];
  const productMeta = await getMeta(productDb, 'products');
  const productIdColumn = firstColumn(imageMeta, ['product_id', 'local_product_id']);
  const imagePk = imageMeta.primaryKey;
  const imageUrl = selectExpr(imageMeta, ['image_url', 'url', 'image_path', 'path', 'file_url', 'file_path', 'src'], 'image_url', 'NULL');
  const sku = selectExpr(imageMeta, ['sku', 'local_sku', 'product_sku', 'variant_sku'], 'image_sku', 'NULL');
  const variantId = selectExpr(imageMeta, ['variant_id', 'product_variant_id'], 'variant_id', 'NULL');
  const isMain = selectExpr(imageMeta, ['is_main', 'is_primary', 'is_featured'], 'is_main', '0');
  const width = selectExpr(imageMeta, ['width'], 'width', 'NULL');
  const height = selectExpr(imageMeta, ['height'], 'height', 'NULL');
  const updated = selectExpr(imageMeta, ['updated_at', 'created_at'], 'updated_at', 'NULL');

  if (productMeta.exists && productIdColumn && has(productMeta, 'id')) {
    const productSku = firstColumn(productMeta, ['sku', 'product_sku', 'local_sku', 'seller_sku']);
    const productName = firstColumn(productMeta, ['title', 'name', 'product_name']);
    return safeQuery(productDb, `SELECT i.${qid(imagePk)} AS id, i.${qid(productIdColumn)} AS product_id, ${imageUrl}, ${sku}, ${variantId}, ${isMain}, ${width}, ${height}, ${updated}, ${productSku ? `p.${qid(productSku)}` : 'NULL'} AS product_sku, ${productName ? `p.${qid(productName)}` : 'NULL'} AS product_name FROM product_images i LEFT JOIN products p ON p.id = i.${qid(productIdColumn)} ORDER BY i.${qid(imagePk)} DESC LIMIT 2000`, [], []);
  }
  return safeQuery(productDb, `SELECT ${qid(imagePk)} AS id, NULL AS product_id, ${imageUrl}, ${sku}, ${variantId}, ${isMain}, ${width}, ${height}, ${updated}, NULL AS product_sku, NULL AS product_name FROM product_images ORDER BY ${qid(imagePk)} DESC LIMIT 2000`, [], []);
}

async function runImageAudit() {
  const checks = [];
  const images = await readProductImageRows();
  const seenProducts = new Set();
  const duplicates = new Map();

  images.forEach((image) => {
    const productKey = String(image.product_id || image.product_sku || image.image_sku || '').trim();
    if (Number(image.is_main || 0) === 1 && productKey) seenProducts.add(productKey);
    const imageUrl = resolveImageValue(image);
    if (imageUrl) duplicates.set(imageUrl, (duplicates.get(imageUrl) || 0) + 1);
  });

  images.forEach((image) => {
    const url = resolveImageValue(image);
    const sku = normalizeSku(image.image_sku || image.product_sku) || '-';
    const productName = image.product_name || sku;
    const width = toInt(image.width, 0);
    const height = toInt(image.height, 0);
    const isMain = Number(image.is_main || 0) === 1;
    let status = 'pass';
    let checkType = 'ok';
    let message = 'Image looks okay.';
    if (!url) {
      status = 'fail';
      checkType = 'missing_main';
      message = 'Image URL is missing.';
    } else if (!isMain && !image.variant_id) {
      status = 'warning';
      checkType = 'variant_missing';
      message = 'Image is gallery image. Check whether main/variant image is assigned.';
    } else if ((width && width < 1500) || (height && height < 1500)) {
      status = 'warning';
      checkType = 'low_resolution';
      message = 'Image size is below 1500 x 1500.';
    } else if (duplicates.get(url) > 1) {
      status = 'warning';
      checkType = 'duplicate';
      message = 'Same image URL is used more than once.';
    }
    checks.push({ local_sku: sku, product_name: productName, image_url: url, image_type: image.variant_id ? 'variant' : isMain ? 'main' : 'gallery', width: width || null, height: height || null, marketplace: 'LOCAL', check_type: checkType, status, message });
  });

  const listingMeta = await getMeta(productDb, 'marketplace_listings');
  if (listingMeta.exists) {
    const rows = await safeQuery(productDb, `SELECT local_sku, title AS product_name, image_url, marketplace FROM marketplace_listings WHERE image_url IS NULL OR image_url = '' LIMIT 500`, [], []);
    rows.forEach((row) => checks.push({ local_sku: normalizeSku(row.local_sku) || '-', product_name: row.product_name || row.local_sku, image_url: '', image_type: 'marketplace', width: null, height: null, marketplace: row.marketplace || 'LOCAL', check_type: 'marketplace_missing', status: 'fail', message: 'Marketplace listing image is missing.' }));
  }

  if (await tableExists(productDb, 'image_dashboard_checks')) {
    await productDb.query('DELETE FROM image_dashboard_checks');
    for (const check of checks) {
      await productDb.query(`INSERT INTO image_dashboard_checks (local_sku, product_name, image_url, image_type, width, height, marketplace, check_type, status, message, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [check.local_sku, check.product_name, check.image_url || null, check.image_type, check.width, check.height, check.marketplace, check.check_type, check.status, check.message]);
    }
  }
  return { total_checked: checks.length, success: true };
}

async function getImageDashboard(params = {}) {
  const { page, limit, offset } = listParams(params, 30, 300);
  if (await tableExists(productDb, 'image_dashboard_checks')) {
    const countExisting = await safeOne(productDb, 'SELECT COUNT(*) AS total FROM image_dashboard_checks', [], { total: 0 });
    if (!Number(countExisting.total || 0)) await runImageAudit();

    const values = [];
    const where = [];
    if (params.search) { where.push('(local_sku LIKE ? OR product_name LIKE ? OR message LIKE ?)'); values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`); }
    if (params.status) { where.push('status = ?'); values.push(params.status); }
    if (params.check_type) { where.push('check_type = ?'); values.push(params.check_type); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await safeQuery(productDb, `SELECT * FROM image_dashboard_checks ${whereSql} ORDER BY FIELD(status,'fail','warning','pass'), checked_at DESC, id DESC LIMIT ? OFFSET ?`, [...values, limit, offset], []);
    const countRow = await safeOne(productDb, `SELECT COUNT(*) AS total FROM image_dashboard_checks ${whereSql}`, values, { total: 0 });
    const summary = await safeOne(productDb, `SELECT COUNT(*) AS total_checks, COALESCE(SUM(CASE WHEN status='fail' THEN 1 ELSE 0 END),0) AS failed, COALESCE(SUM(CASE WHEN status='warning' THEN 1 ELSE 0 END),0) AS warning, COALESCE(SUM(CASE WHEN check_type='missing_main' THEN 1 ELSE 0 END),0) AS missing_main, COALESCE(SUM(CASE WHEN check_type='low_resolution' THEN 1 ELSE 0 END),0) AS low_resolution, COALESCE(SUM(CASE WHEN check_type='sync_failed' THEN 1 ELSE 0 END),0) AS sync_failed FROM image_dashboard_checks`, [], { total_checks: 0, failed: 0, warning: 0, missing_main: 0, low_resolution: 0, sync_failed: 0 });
    return { rows, summary, pagination: emptyPagination(page, limit, offset, countRow.total) };
  }
  return { rows: [], summary: { total_checks: 0, failed: 0, warning: 0, missing_main: 0, low_resolution: 0, sync_failed: 0 }, pagination: emptyPagination(page, limit, offset, 0) };
}

async function updateImageUrl(id, imageUrl, userId = null) {
  const meta = await getMeta(productDb, 'product_images');
  if (!meta.exists) throw new Error('product_images table missing.');
  const urlColumn = firstColumn(meta, ['image_url', 'url', 'image_path', 'path', 'file_url', 'file_path', 'src']);
  if (!urlColumn) throw new Error('No image URL column found in product_images table.');
  await productDb.query(`UPDATE product_images SET ${qid(urlColumn)} = ? ${has(meta, 'updated_at') ? ', updated_at = NOW()' : ''} WHERE ${qid(meta.primaryKey)} = ?`, [imageUrl, id]);
  if (await tableExists(productDb, 'image_sync_logs')) await productDb.query(`INSERT INTO image_sync_logs (local_sku, marketplace, image_url, action, status, created_at) VALUES ('-', 'LOCAL', ?, 'update_url', 'success', NOW())`, [imageUrl]);
  await runImageAudit();
  return { id, image_url: imageUrl };
}

async function setMainImage(id, userId = null) {
  const meta = await getMeta(productDb, 'product_images');
  if (!meta.exists || !has(meta, 'is_main')) throw new Error('product_images.is_main column missing.');
  const productIdColumn = firstColumn(meta, ['product_id', 'local_product_id']);
  const rows = await safeQuery(productDb, `SELECT * FROM product_images WHERE ${qid(meta.primaryKey)} = ? LIMIT 1`, [id], []);
  const image = rows[0];
  if (!image) throw new Error('Image not found.');
  if (productIdColumn && image[productIdColumn]) await productDb.query(`UPDATE product_images SET is_main = 0 WHERE ${qid(productIdColumn)} = ?`, [image[productIdColumn]]);
  await productDb.query(`UPDATE product_images SET is_main = 1 ${has(meta, 'updated_at') ? ', updated_at = NOW()' : ''} WHERE ${qid(meta.primaryKey)} = ?`, [id]);
  await runImageAudit();
  return { id, is_main: 1 };
}

async function pushImage(payload = {}) {
  const marketplace = String(payload.marketplace || 'DARAZ').toUpperCase();
  if (!['DARAZ', 'WOO', 'LOCAL'].includes(marketplace)) throw new Error('Marketplace must be DARAZ, WOO, or LOCAL.');
  const sku = normalizeSku(payload.local_sku || payload.sku) || '-';
  const imageUrl = payload.image_url || null;
  let insertedId = null;
  if (await tableExists(productDb, 'image_sync_logs')) {
    const [result] = await productDb.query(`INSERT INTO image_sync_logs (local_sku, marketplace, account_id, image_url, action, status, request_payload, created_at) VALUES (?, ?, ?, ?, 'push_image', 'pending', ?, NOW())`, [sku, marketplace, payload.account_id || null, imageUrl, jsonValue(payload)]);
    insertedId = result.insertId;
  }
  return { id: insertedId, local_sku: sku, marketplace, status: 'pending', message: 'Image push added to queue. Daraz/Woo API worker can process this queue.' };
}

async function getSkuEconomics(skuInput) {
  const sku = normalizeSku(skuInput);
  if (!sku) throw new Error('SKU is required.');
  const metrics = (await buildSkuMetrics()).find((row) => normalizeSku(row.local_sku) === sku) || { local_sku: sku, sales_7_days: 0, sales_30_days: 0, sales_60_days: 0, sales_90_days: 0, orders_30_days: 0, revenue_30_days: 0, revenue_90_days: 0, available_stock: 0, stock_qty: 0, reserved_qty: 0, cost_price: 0 };
  const prices = await safeQuery(productDb, `SELECT * FROM marketplace_listing_prices WHERE local_sku = ? ORDER BY updated_at DESC`, [sku], []);
  const listings = await safeQuery(productDb, `SELECT * FROM marketplace_listings WHERE local_sku = ? ORDER BY marketplace, account_code`, [sku], []);
  const avgDaily = money(Number(metrics.sales_30_days || 0) / 30);
  const available = toInt(metrics.available_stock, 0);
  const daysOfCover = avgDaily > 0 ? money(available / avgDaily) : 0;
  const sales = {
    units_7d: toInt(metrics.sales_7_days, 0),
    units_30d: toInt(metrics.sales_30_days, 0),
    units_60d: toInt(metrics.sales_60_days, 0),
    units_90d: toInt(metrics.sales_90_days, 0),
    orders: toInt(metrics.orders_30_days, 0),
    revenue: money(metrics.revenue_90_days),
    net_sales: money(metrics.revenue_30_days),
    ppc_cost: 0,
    promotion_cost: 0,
    fee_total: 0,
    average_daily_sales: avgDaily,
    days_of_cover: daysOfCover,
  };
  const issues = [];
  if (available <= toInt(metrics.low_stock_alert_qty, 5)) issues.push('Low stock');
  if (!listings.length) issues.push('No marketplace listing mapping');
  if (prices.some((p) => calcPrice(p).status === 'loss')) issues.push('Loss making listing');
  if (!toInt(metrics.sales_30_days, 0)) issues.push('No sales in last 30 days');
  return { sku, inventory: metrics, sales, listings, prices: prices.map((p) => ({ ...p, ...calcPrice(p) })), suppliers: [], daily_sales: [], issues };
}

async function getDemandAnalysis(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 300);
  const allRows = await buildSkuMetrics();
  const filtered = allRows.map((row) => {
    const avg = money(Number(row.sales_30_days || 0) / 30);
    const leadTime = 7;
    const safetyDays = toInt(params.safety_days, 7);
    const available = toInt(row.available_stock, 0);
    const reorderQty = Math.max(Math.ceil(avg * leadTime + avg * safetyDays - available), 0);
    const priority = reorderQty > 0 && available <= toInt(row.low_stock_alert_qty, 5) ? 'urgent' : reorderQty > 0 ? 'need_order' : Number(row.sales_90_days || 0) <= 0 && available > 0 ? 'slow_moving' : 'good';
    const reason = priority === 'urgent' ? 'Low stock and reorder required.' : priority === 'need_order' ? 'Stock may finish before next replenishment.' : priority === 'slow_moving' ? 'No sales in last 90 days.' : 'Stock level is okay.';
    return { ...row, average_daily_sales: avg, supplier_lead_time_days: leadTime, safety_days: safetyDays, suggested_reorder_qty: reorderQty, priority, reason };
  });
  const rows = filtered.slice(offset, offset + limit);
  return { rows, pagination: emptyPagination(page, limit, offset, filtered.length) };
}

async function getProductMetrics(params = {}) {
  const rows = await buildSkuMetrics();
  return { rows, by_sku: rows.reduce((acc, row) => { acc[normalizeSku(row.local_sku)] = row; return acc; }, {}) };
}

async function skuSearch(skuInput) {
  const sku = normalizeSku(skuInput);
  if (!sku) throw new Error('SKU is required.');
  const economics = await getSkuEconomics(sku);
  const demand = (await getDemandAnalysis({ limit: 10000 })).rows.find((row) => normalizeSku(row.local_sku) === sku) || null;
  const pendingPush = await safeQuery(productDb, `SELECT * FROM inventory_stock_push_queue WHERE local_sku = ? ORDER BY created_at DESC LIMIT 10`, [sku], []);
  const settings = await getAutoStockSettings();
  return { ...economics, demand, pending_stock_push: pendingPush, auto_stock_settings: settings };
}

async function ensureStockSettingsRows() {
  if (!(await tableExists(productDb, 'stock_sync_settings'))) return;
  await productDb.query(`INSERT IGNORE INTO stock_sync_settings (setting_key, setting_value, note) VALUES ('daraz_auto_stock_update','0','Auto push local stock to Daraz after order/inventory update'), ('woo_auto_stock_update','0','Auto push local stock to Woo after order/inventory update')`);
}

async function getAutoStockSettings() {
  await ensureStockSettingsRows();
  const rows = await safeQuery(productDb, `SELECT setting_key, setting_value FROM stock_sync_settings WHERE setting_key IN ('daraz_auto_stock_update','woo_auto_stock_update')`, [], []);
  const out = { daraz_auto_stock_update: false, woo_auto_stock_update: false };
  rows.forEach((row) => { out[row.setting_key] = String(row.setting_value) === '1' || String(row.setting_value).toLowerCase() === 'true'; });
  return out;
}

async function saveAutoStockSettings(payload = {}) {
  if (!(await tableExists(productDb, 'stock_sync_settings'))) throw new Error('stock_sync_settings table missing. Run database_phase4_operational_hotfix.sql.');
  const settings = {
    daraz_auto_stock_update: payload.daraz_auto_stock_update ? '1' : '0',
    woo_auto_stock_update: payload.woo_auto_stock_update ? '1' : '0',
  };
  for (const [key, value] of Object.entries(settings)) {
    await productDb.query(`INSERT INTO stock_sync_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`, [key, value]);
  }
  return getAutoStockSettings();
}

async function pushStock(payload = {}, userId = null) {
  const sku = normalizeSku(payload.local_sku || payload.sku);
  if (!sku) throw new Error('SKU is required.');
  const marketplace = String(payload.marketplace || '').toUpperCase();
  if (!['DARAZ', 'WOO', 'LOCAL'].includes(marketplace)) throw new Error('Marketplace must be DARAZ, WOO, or LOCAL.');
  const qty = toInt(payload.qty ?? payload.stock_qty ?? payload.available_qty ?? payload.requested_qty, 0);
  const [result] = await productDb.query(`INSERT INTO inventory_stock_push_queue (local_sku, marketplace, account_id, marketplace_sku, requested_qty, status, created_by) VALUES (?, ?, ?, ?, ?, 'pending', ?)`, [sku, marketplace, payload.account_id || null, payload.marketplace_sku || null, qty, userId]);
  return { id: result.insertId, local_sku: sku, marketplace, requested_qty: qty, status: 'pending' };
}

async function manualStockUpdate(payload = {}, userId = null) {
  const sku = normalizeSku(payload.local_sku || payload.sku);
  if (!sku) throw new Error('SKU is required.');
  const qty = toInt(payload.stock_qty ?? payload.qty ?? payload.available_qty, 0);
  const meta = await getMeta(productDb, 'product_inventory');
  if (!meta.exists) throw new Error('product_inventory table missing.');
  const skuColumn = firstColumn(meta, ['sku', 'local_sku', 'product_sku', 'seller_sku', 'variant_sku']);
  const stockColumn = firstColumn(meta, ['stock_qty', 'qty', 'quantity', 'stock']);
  if (!skuColumn || !stockColumn) throw new Error('product_inventory sku/stock column missing.');
  const existing = await safeOne(productDb, `SELECT * FROM product_inventory WHERE ${qid(skuColumn)} = ? LIMIT 1`, [sku], null);
  const oldQty = toInt(existing?.[stockColumn], 0);
  if (existing) {
    await productDb.query(`UPDATE product_inventory SET ${qid(stockColumn)} = ? ${has(meta, 'available_qty') ? `, available_qty = GREATEST(? - ${firstColumn(meta, ['reserved_qty', 'reserved_stock']) ? `COALESCE(${qid(firstColumn(meta, ['reserved_qty', 'reserved_stock']))},0)` : '0'},0)` : ''} ${has(meta, 'updated_at') ? ', updated_at = NOW()' : ''} WHERE ${qid(skuColumn)} = ?`, has(meta, 'available_qty') ? [qty, qty, sku] : [qty, sku]);
  } else {
    const cols = [skuColumn, stockColumn];
    const vals = [sku, qty];
    if (has(meta, 'available_qty')) { cols.push('available_qty'); vals.push(qty); }
    await productDb.query(`INSERT INTO product_inventory (${cols.map(qid).join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
  }
  if (await tableExists(productDb, 'inventory_ledger')) await productDb.query(`INSERT INTO inventory_ledger (local_sku, movement_type, reference_type, qty_before, qty_change, qty_after, note, created_by) VALUES (?, 'ADJUSTMENT', 'manual_stock_update', ?, ?, ?, ?, ?)`, [sku, oldQty, qty - oldQty, qty, payload.note || 'Manual stock update from SKU Search/Product Dashboard', userId]);
  if (await tableExists(productDb, 'stock_update_logs')) await productDb.query(`INSERT INTO stock_update_logs (local_sku, old_qty, new_qty, source, note, created_by) VALUES (?, ?, ?, 'manual', ?, ?)`, [sku, oldQty, qty, payload.note || null, userId]);
  const settings = await getAutoStockSettings();
  const queued = [];
  if (payload.push_daraz || settings.daraz_auto_stock_update) queued.push(await pushStock({ local_sku: sku, marketplace: 'DARAZ', requested_qty: qty }, userId));
  if (payload.push_woo || settings.woo_auto_stock_update) queued.push(await pushStock({ local_sku: sku, marketplace: 'WOO', requested_qty: qty }, userId));
  return { local_sku: sku, old_qty: oldQty, new_qty: qty, queued };
}

async function createTransferJob(payload = {}, userId = null) {
  const marketplace = String(payload.marketplace || '').toUpperCase();
  if (!['DARAZ', 'WOO'].includes(marketplace)) throw new Error('Marketplace must be DARAZ or WOO.');
  const [result] = await productDb.query(`INSERT INTO marketplace_transfer_jobs (local_product_id, local_sku, marketplace, account_id, category_id, payload_json, status, created_by) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`, [payload.local_product_id || payload.product_id || null, normalizeSku(payload.local_sku || payload.sku), marketplace, payload.account_id || null, payload.category_id || null, jsonValue(payload.payload || payload), userId]);
  return { id: result.insertId, status: 'pending' };
}

module.exports = {
  getBusinessDashboard,
  getPriceDashboard,
  recalculatePrices,
  getImageDashboard,
  runImageAudit,
  updateImageUrl,
  setMainImage,
  pushImage,
  getSkuEconomics,
  getDemandAnalysis,
  getProductMetrics,
  skuSearch,
  pushStock,
  manualStockUpdate,
  getAutoStockSettings,
  saveAutoStockSettings,
  createTransferJob,
  calcPrice,
};

const orderDb = require("../../config/order_management_db/order_management_db");
const productDb = require("../../config/product_management_db/product_management_db");
const inventoryDb = require("../../config/inventory_management_db/inventory_management_db");

// Same rule as the SKU Economics Report and customer order stats — a
// cancelled/returned item never counts as real movement.
const EXCLUDED_STATUSES = new Set(["cancelled", "canceled", "returned", "shipped_back_success"]);

function isCountableStatus(status) {
  return !EXCLUDED_STATUSES.has(String(status || "").toLowerCase());
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function getSkuMappings() {
  const [rows] = await productDb.query("SELECT wrong_sku, correct_sku FROM sku_mappings");
  const map = new Map();
  rows.forEach((row) => map.set(row.wrong_sku, row.correct_sku));
  return map;
}

function resolveSku(rawSku, mappingMap) {
  const clean = String(rawSku || "").trim();
  if (!clean) return null;
  return mappingMap.get(clean) || clean;
}

async function getRecentOrderItems(sinceDate) {
  const [localRows] = await orderDb.query(
    `SELECT COALESCE(NULLIF(oi.local_sku, ''), oi.sku) AS sku, oi.qty, o.order_date, o.order_status AS status
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.order_date >= ?`,
    [sinceDate]
  );

  const [darazRows] = await orderDb.query(
    `SELECT COALESCE(NULLIF(doi.local_sku, ''), NULLIF(doi.seller_sku, ''), doi.marketplace_sku) AS sku,
            doi.qty, do2.order_date, do2.order_status AS status
     FROM daraz_order_items doi
     JOIN daraz_orders do2 ON do2.id = doi.daraz_order_id
     WHERE do2.order_date >= ?`,
    [sinceDate]
  );

  const [wooRows] = await orderDb.query(
    `SELECT COALESCE(NULLIF(woi.local_sku, ''), NULLIF(woi.sku, ''), woi.marketplace_sku) AS sku,
            woi.qty, wo.order_date, wo.order_status AS status
     FROM woo_order_items woi
     JOIN woo_orders wo ON wo.id = woi.woo_order_id
     WHERE wo.order_date >= ?`,
    [sinceDate]
  );

  return [...localRows, ...darazRows, ...wooRows];
}

async function getCatalog() {
  const [productRows] = await productDb.query(
    "SELECT sku, product_name FROM products WHERE deleted_at IS NULL"
  );

  const [variantRows] = await productDb.query(
    `SELECT pv.variant_sku AS sku, COALESCE(pv.variant_name, p.product_name) AS product_name
     FROM product_variants pv
     LEFT JOIN products p ON p.id = pv.product_id
     WHERE pv.deleted_at IS NULL`
  );

  const map = new Map();
  [...productRows, ...variantRows].forEach((row) => {
    if (row.sku) map.set(row.sku, row.product_name);
  });
  return map;
}

async function getStockMap() {
  const [rows] = await inventoryDb.query(
    "SELECT sku, stock_qty, available_qty FROM product_inventory WHERE deleted_at IS NULL"
  );

  const map = new Map();
  rows.forEach((row) => map.set(row.sku, row));
  return map;
}

async function getProductTrends() {
  const since90 = daysAgo(90);
  const cutoff7 = daysAgo(7).getTime();
  const cutoff30 = daysAgo(30).getTime();

  const [mappingMap, rawItems, catalogMap, stockMap] = await Promise.all([
    getSkuMappings(),
    getRecentOrderItems(since90),
    getCatalog(),
    getStockMap(),
  ]);

  const bySku = new Map();

  rawItems.forEach((row) => {
    if (!isCountableStatus(row.status)) return;

    const sku = resolveSku(row.sku, mappingMap);
    if (!sku) return;

    const orderTime = new Date(row.order_date).getTime();
    if (!Number.isFinite(orderTime)) return;

    const qty = Number(row.qty) || 0;

    const existing = bySku.get(sku) || { qty_7d: 0, qty_30d: 0, qty_90d: 0 };
    existing.qty_90d += qty;
    if (orderTime >= cutoff30) existing.qty_30d += qty;
    if (orderTime >= cutoff7) existing.qty_7d += qty;
    bySku.set(sku, existing);
  });

  // Union of every SKU with either recent movement or a known stock
  // record, so slow/dead stock (stock on hand, zero sales) shows up too —
  // not just fast movers.
  const allSkus = new Set([...bySku.keys(), ...stockMap.keys()]);

  const rows = Array.from(allSkus).map((sku) => {
    const movement = bySku.get(sku) || { qty_7d: 0, qty_30d: 0, qty_90d: 0 };
    const stock = stockMap.get(sku) || null;
    const stockQty = stock ? Number(stock.stock_qty) || 0 : 0;

    return {
      sku,
      product_name: catalogMap.get(sku) || null,
      qty_7d: movement.qty_7d,
      qty_30d: movement.qty_30d,
      qty_90d: movement.qty_90d,
      stock_qty: stock ? stockQty : null,
      available_qty: stock ? Number(stock.available_qty) || 0 : null,
      // How much would be needed to cover the last 30 days of demand again
      // from today's stock position — a simple, transparent reorder signal
      // rather than a full lead-time/safety-stock model.
      restock_qty: Math.max(0, movement.qty_30d - stockQty),
    };
  });

  rows.sort((a, b) => b.qty_30d - a.qty_30d);

  return rows;
}

module.exports = { getProductTrends };

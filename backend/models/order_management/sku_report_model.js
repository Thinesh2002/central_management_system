const orderDb = require("../../config/order_management_db/order_management_db");
const productDb = require("../../config/product_management_db/product_management_db");
const inventoryDb = require("../../config/inventory_management_db/inventory_management_db");
const priceDb = require("../../config/price_management_db/price_management_db");
const marketplaceDb = require("../../config/marketplace_management_db/cm_marketplace_management");

// Cancelled/returned/sent-back items never count as real sales, on any platform.
const EXCLUDED_STATUSES = new Set(["canceled", "cancelled", "returned", "shipped_back_success"]);

function isCountableStatus(status) {
  return !EXCLUDED_STATUSES.has(String(status || "").toLowerCase());
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

// A SKU sitting in sku_mappings is a known-wrong marketplace SKU (e.g. a
// typo'd Daraz seller_sku) — resolve it to the real local SKU before doing
// any lookup, so the report reflects the correct product's actual history
// instead of coming up empty for the wrong SKU.
async function resolveMappedSku(sku) {
  const [rows] = await productDb.query(
    "SELECT correct_sku FROM sku_mappings WHERE wrong_sku = ? LIMIT 1",
    [sku]
  );

  return rows[0]?.correct_sku || null;
}

async function getLocalProduct(sku) {
  const [productRows] = await productDb.query(
    "SELECT id, sku, product_name, status FROM products WHERE sku = ? AND deleted_at IS NULL LIMIT 1",
    [sku]
  );

  if (productRows.length) {
    return {
      type: "product",
      id: productRows[0].id,
      sku: productRows[0].sku,
      title: productRows[0].product_name,
      status: productRows[0].status,
    };
  }

  const [variantRows] = await productDb.query(
    `SELECT pv.id, pv.variant_sku, pv.variant_name, pv.colour_name, pv.status, p.product_name
     FROM product_variants pv
     LEFT JOIN products p ON p.id = pv.product_id
     WHERE pv.variant_sku = ? AND pv.deleted_at IS NULL
     LIMIT 1`,
    [sku]
  );

  if (variantRows.length) {
    const row = variantRows[0];
    return {
      type: "variant",
      id: row.id,
      sku: row.variant_sku,
      title: row.variant_name || `${row.product_name || "Product"} - ${row.colour_name || ""}`.trim(),
      status: row.status,
    };
  }

  return null;
}

async function getStockAndPrice(sku) {
  const [inventoryRows] = await inventoryDb.query(
    "SELECT stock_qty, reserved_qty, available_qty, low_stock_alert_qty FROM product_inventory WHERE sku = ? AND deleted_at IS NULL LIMIT 1",
    [sku]
  );

  const [priceRows] = await priceDb.query(
    "SELECT cost_price, local_selling_price, sale_price, daraz_price, woo_price, currency FROM product_prices WHERE sku = ? AND deleted_at IS NULL LIMIT 1",
    [sku]
  );

  return {
    stock: inventoryRows[0] || null,
    price: priceRows[0] || null,
  };
}

async function getMarketplaceListings(sku) {
  const [darazRows] = await productDb.query(
    `SELECT id, account_id, seller_sku, name, price, sale_price, quantity, status
     FROM daraz_products WHERE seller_sku = ?`,
    [sku]
  );

  const [wooRows] = await productDb.query(
    `SELECT id, account_id, sku, name, price, regular_price, sale_price, stock_quantity, stock_status
     FROM woo_products WHERE sku = ?`,
    [sku]
  );

  const accountIds = Array.from(
    new Set([...darazRows.map((r) => r.account_id), ...wooRows.map((r) => r.account_id)].filter(Boolean))
  );

  let accountMap = new Map();

  if (accountIds.length) {
    const [accountRows] = await marketplaceDb.query(
      `SELECT id, account_name FROM accounts WHERE id IN (${accountIds.map(() => "?").join(",")})`,
      accountIds
    );
    accountMap = new Map(accountRows.map((row) => [row.id, row.account_name]));
  }

  return {
    daraz: darazRows.map((row) => ({
      account_id: row.account_id,
      account_name: accountMap.get(row.account_id) || `Account ${row.account_id}`,
      title: row.name,
      price: toNumber(row.sale_price || row.price),
      stock_qty: toNumber(row.quantity),
      status: row.status,
    })),
    woo: wooRows.map((row) => ({
      account_id: row.account_id,
      account_name: accountMap.get(row.account_id) || `Account ${row.account_id}`,
      title: row.name,
      price: toNumber(row.sale_price || row.regular_price || row.price),
      stock_qty: toNumber(row.stock_quantity),
      status: row.stock_status,
    })),
  };
}

async function getDarazHistory(sku) {
  const [rows] = await orderDb.query(
    `SELECT
        doi.id, doi.qty, doi.unit_price, doi.discount_amount, doi.line_total, doi.item_status,
        doi.product_title, doi.variation_name,
        do2.order_number, do2.daraz_order_id, do2.order_date, do2.order_status, do2.account_name, do2.buyer_name
     FROM daraz_order_items doi
     INNER JOIN daraz_orders do2 ON do2.id = doi.daraz_order_id
     WHERE doi.seller_sku = ? OR doi.local_sku = ? OR doi.marketplace_sku = ?
     ORDER BY do2.order_date DESC`,
    [sku, sku, sku]
  );

  return rows.map((row) => ({
    platform: "DARAZ",
    order_no: row.order_number || row.daraz_order_id,
    order_date: row.order_date,
    status: row.item_status || row.order_status,
    account_name: row.account_name,
    buyer: row.buyer_name,
    product_title: row.product_title,
    variation: row.variation_name,
    qty: toNumber(row.qty),
    unit_price: toNumber(row.unit_price),
    discount_amount: toNumber(row.discount_amount),
    line_total: toNumber(row.line_total),
  }));
}

async function getWooHistory(sku) {
  const [rows] = await orderDb.query(
    `SELECT
        woi.id, woi.qty, woi.unit_price, woi.discount_amount, woi.line_total, woi.item_status,
        woi.product_title, woi.variation_name,
        wo.order_number, wo.woo_order_id, wo.order_date, wo.order_status, wo.account_name, wo.buyer_name
     FROM woo_order_items woi
     INNER JOIN woo_orders wo ON wo.id = woi.woo_order_id
     WHERE woi.sku = ? OR woi.local_sku = ? OR woi.marketplace_sku = ?
     ORDER BY wo.order_date DESC`,
    [sku, sku, sku]
  );

  return rows.map((row) => ({
    platform: "WOO",
    order_no: row.order_number || row.woo_order_id,
    order_date: row.order_date,
    status: row.item_status || row.order_status,
    account_name: row.account_name,
    buyer: row.buyer_name,
    product_title: row.product_title,
    variation: row.variation_name,
    qty: toNumber(row.qty),
    unit_price: toNumber(row.unit_price),
    discount_amount: toNumber(row.discount_amount),
    line_total: toNumber(row.line_total),
  }));
}

async function getLocalHistory(sku) {
  const [rows] = await orderDb.query(
    `SELECT
        oi.id, oi.qty, oi.unit_price, oi.discount_amount, oi.line_total, oi.item_status,
        oi.product_title, oi.variation_name,
        o.order_no, o.order_date, o.order_status, o.account_name, o.customer_id
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     WHERE oi.local_sku = ? OR oi.sku = ?
     ORDER BY o.order_date DESC`,
    [sku, sku]
  );

  return rows.map((row) => ({
    platform: "LOCAL",
    order_no: row.order_no,
    order_date: row.order_date,
    status: row.item_status || row.order_status,
    account_name: row.account_name,
    buyer: null,
    product_title: row.product_title,
    variation: row.variation_name,
    qty: toNumber(row.qty),
    unit_price: toNumber(row.unit_price),
    discount_amount: toNumber(row.discount_amount),
    line_total: toNumber(row.line_total),
  }));
}

function buildDailySeries(countableHistory, days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byDate = new Map();

  countableHistory.forEach((row) => {
    const key = toDateKey(row.order_date);
    if (!key) return;

    const existing = byDate.get(key) || { date: key, sales_amount: 0, qty: 0 };
    existing.sales_amount += row.line_total;
    existing.qty += row.qty;
    byDate.set(key, existing);
  });

  const series = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);

    const point = byDate.get(key) || { date: key, sales_amount: 0, qty: 0 };
    series.push({
      date: key,
      sales_amount: Number(point.sales_amount.toFixed(2)),
      qty: point.qty,
    });
  }

  return series;
}

function summarizePlatform(history) {
  const countable = history.filter((row) => isCountableStatus(row.status));

  return {
    order_count: countable.length,
    total_qty: countable.reduce((sum, row) => sum + row.qty, 0),
    total_sales: Number(countable.reduce((sum, row) => sum + row.line_total, 0).toFixed(2)),
    net_sales: Number(
      countable.reduce((sum, row) => sum + (row.line_total - row.discount_amount), 0).toFixed(2)
    ),
  };
}

async function getSkuReport(requestedSku) {
  const mappedSku = await resolveMappedSku(requestedSku);
  const sku = mappedSku || requestedSku;

  const [localProduct, stockAndPrice, listings, darazHistory, wooHistory, localHistory] = await Promise.all([
    getLocalProduct(sku),
    getStockAndPrice(sku),
    getMarketplaceListings(sku),
    getDarazHistory(sku),
    getWooHistory(sku),
    getLocalHistory(sku),
  ]);

  const allHistory = [...darazHistory, ...wooHistory, ...localHistory].sort(
    (a, b) => new Date(b.order_date) - new Date(a.order_date)
  );

  const countableHistory = allHistory.filter((row) => isCountableStatus(row.status));

  const platforms = [
    { platform: "DARAZ", has_listing: listings.daraz.length > 0, ...summarizePlatform(darazHistory) },
    { platform: "WOO", has_listing: listings.woo.length > 0, ...summarizePlatform(wooHistory) },
    { platform: "LOCAL", has_listing: Boolean(localProduct), ...summarizePlatform(localHistory) },
  ].filter((row) => row.has_listing || row.order_count > 0);

  const totals = {
    total_sales: Number(countableHistory.reduce((sum, row) => sum + row.line_total, 0).toFixed(2)),
    net_sales: Number(
      countableHistory.reduce((sum, row) => sum + (row.line_total - row.discount_amount), 0).toFixed(2)
    ),
    total_qty: countableHistory.reduce((sum, row) => sum + row.qty, 0),
    order_count: countableHistory.length,
  };

  const last30 = buildDailySeries(countableHistory, 30);
  const last90 = buildDailySeries(countableHistory, 90);

  return {
    sku,
    requested_sku: requestedSku,
    mapped_from: mappedSku ? requestedSku : null,
    local_product: localProduct,
    stock: stockAndPrice.stock,
    price: stockAndPrice.price,
    listings,
    platforms,
    totals,
    history: allHistory,
    daily_series: { last_30_days: last30, last_90_days: last90 },
  };
}

module.exports = { getSkuReport };

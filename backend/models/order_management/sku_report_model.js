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

async function localSkuExists(sku) {
  const [productRows] = await productDb.query(
    "SELECT 1 FROM products WHERE sku = ? AND deleted_at IS NULL LIMIT 1",
    [sku]
  );
  if (productRows.length) return true;

  const [variantRows] = await productDb.query(
    "SELECT 1 FROM product_variants WHERE variant_sku = ? AND deleted_at IS NULL LIMIT 1",
    [sku]
  );
  return variantRows.length > 0;
}

async function resolveMappedSku(sku) {
  const [rows] = await productDb.query(
    "SELECT correct_sku FROM sku_mappings WHERE wrong_sku = ? LIMIT 1",
    [sku]
  );

  return rows[0]?.correct_sku || null;
}

// Every wrong SKU on record that resolves to this correct SKU — old order
// rows (Daraz/Woo/local) may have been recorded under any of them before
// the typo was caught, so history lookups need to match all of them, not
// just today's correct SKU.
async function getKnownWrongSkusFor(correctSku) {
  const [rows] = await productDb.query(
    "SELECT wrong_sku FROM sku_mappings WHERE correct_sku = ?",
    [correctSku]
  );

  return rows.map((row) => row.wrong_sku);
}

// Two-step resolution, in order: (1) is this already a real local SKU? if
// so it IS the correct SKU, no mapping needed. (2) if not found directly,
// is it a known-wrong SKU with a mapping to the real one? Only fall back to
// using the requested value as-is if neither check finds anything.
async function resolveSku(requestedSku) {
  const isDirectMatch = await localSkuExists(requestedSku);

  if (isDirectMatch) {
    return { sku: requestedSku, mappedFrom: null };
  }

  const mapped = await resolveMappedSku(requestedSku);

  if (mapped) {
    return { sku: mapped, mappedFrom: requestedSku };
  }

  return { sku: requestedSku, mappedFrom: null };
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
    `SELECT pv.id, pv.product_id, pv.variant_sku, pv.variant_name, pv.colour_name, pv.status, p.product_name
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
      product_id: row.product_id,
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

// The rest of the app (product_model.js's attachProductImages) matches
// images by product_id/variant_id, not the sku text column on
// product_images — that column isn't reliably populated on every row, so a
// sku-only lookup silently returns nothing for products whose images were
// only ever linked by id. Match by id first (the proven path), and fall
// back to a sku-text match only if that comes up empty.
async function getProductImages(sku, localProduct) {
  if (localProduct?.type === "variant" && localProduct.id) {
    const [variantImageRows] = await productDb.query(
      `SELECT image_url FROM product_images
       WHERE variant_id = ? AND deleted_at IS NULL
       ORDER BY is_main DESC, sort_order ASC`,
      [localProduct.id]
    );

    if (variantImageRows.length) {
      return variantImageRows.map((row) => row.image_url).filter(Boolean);
    }
  }

  const productId =
    localProduct?.type === "product" ? localProduct.id : localProduct?.product_id;

  if (productId) {
    const [productImageRows] = await productDb.query(
      `SELECT image_url FROM product_images
       WHERE product_id = ? AND (variant_id IS NULL OR variant_id = 0) AND deleted_at IS NULL
       ORDER BY is_main DESC, sort_order ASC`,
      [productId]
    );

    if (productImageRows.length) {
      return productImageRows.map((row) => row.image_url).filter(Boolean);
    }
  }

  const [skuImageRows] = await productDb.query(
    `SELECT image_url FROM product_images
     WHERE sku = ? AND deleted_at IS NULL
     ORDER BY is_main DESC, sort_order ASC`,
    [sku]
  );

  return skuImageRows.map((row) => row.image_url).filter(Boolean);
}

function inClause(values) {
  return values.map(() => "?").join(",");
}

async function getMarketplaceListings(skuVariants) {
  const placeholders = inClause(skuVariants);

  const [darazRows] = await productDb.query(
    `SELECT id, account_id, seller_sku, name, price, sale_price, quantity, status
     FROM daraz_products WHERE seller_sku IN (${placeholders})`,
    skuVariants
  );

  const [wooRows] = await productDb.query(
    `SELECT id, account_id, sku, name, price, regular_price, sale_price, stock_quantity, stock_status
     FROM woo_products WHERE sku IN (${placeholders})`,
    skuVariants
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

async function getDarazHistory(skuVariants) {
  const placeholders = inClause(skuVariants);

  const [rows] = await orderDb.query(
    `SELECT
        doi.id, doi.qty, doi.unit_price, doi.discount_amount, doi.line_total, doi.item_status,
        doi.product_title, doi.variation_name,
        do2.order_number, do2.daraz_order_id, do2.order_date, do2.order_status, do2.account_name, do2.buyer_name
     FROM daraz_order_items doi
     INNER JOIN daraz_orders do2 ON do2.id = doi.daraz_order_id
     WHERE doi.seller_sku IN (${placeholders})
        OR doi.local_sku IN (${placeholders})
        OR doi.marketplace_sku IN (${placeholders})
     ORDER BY do2.order_date DESC`,
    [...skuVariants, ...skuVariants, ...skuVariants]
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

async function getWooHistory(skuVariants) {
  const placeholders = inClause(skuVariants);

  const [rows] = await orderDb.query(
    `SELECT
        woi.id, woi.qty, woi.unit_price, woi.discount_amount, woi.line_total, woi.item_status,
        woi.product_title, woi.variation_name,
        wo.order_number, wo.woo_order_id, wo.order_date, wo.order_status, wo.account_name, wo.buyer_name
     FROM woo_order_items woi
     INNER JOIN woo_orders wo ON wo.id = woi.woo_order_id
     WHERE woi.sku IN (${placeholders})
        OR woi.local_sku IN (${placeholders})
        OR woi.marketplace_sku IN (${placeholders})
     ORDER BY wo.order_date DESC`,
    [...skuVariants, ...skuVariants, ...skuVariants]
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

async function getLocalHistory(skuVariants) {
  const placeholders = inClause(skuVariants);

  const [rows] = await orderDb.query(
    `SELECT
        oi.id, oi.qty, oi.unit_price, oi.discount_amount, oi.line_total, oi.item_status,
        oi.product_title, oi.variation_name,
        o.order_no, o.order_date, o.order_status, o.account_name, o.customer_id
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     WHERE oi.local_sku IN (${placeholders}) OR oi.sku IN (${placeholders})
     ORDER BY o.order_date DESC`,
    [...skuVariants, ...skuVariants]
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
  const { sku, mappedFrom } = await resolveSku(requestedSku);

  // Old order/listing rows may still carry any wrong SKU ever mapped to
  // this correct one (or the exact SKU the caller asked for, if it wasn't
  // itself one of the known wrong ones) — search all of them, not just
  // today's correct SKU, so history from before the typo was caught still
  // shows up.
  const knownWrongSkus = await getKnownWrongSkusFor(sku);
  const skuVariants = Array.from(new Set([sku, requestedSku, ...knownWrongSkus].filter(Boolean)));

  // Images are matched by product_id/variant_id (see getProductImages), so
  // the local product record has to be resolved first.
  const localProduct = await getLocalProduct(sku);

  const [stockAndPrice, images, listings, darazHistory, wooHistory, localHistory] = await Promise.all([
    getStockAndPrice(sku),
    getProductImages(sku, localProduct),
    getMarketplaceListings(skuVariants),
    getDarazHistory(skuVariants),
    getWooHistory(skuVariants),
    getLocalHistory(skuVariants),
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
    mapped_from: mappedFrom,
    known_sku_variants: skuVariants,
    local_product: localProduct,
    images,
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

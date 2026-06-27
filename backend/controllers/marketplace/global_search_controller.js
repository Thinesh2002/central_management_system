const asyncHandler = require('../../middleware/async_handler');
const accessModel = require('../../models/accessModel');
const productDb = require('../../config/product_management_db/product_management_db');
const marketplaceDb = require('../../config/marketplace_management_db/cm_marketplace_management');
const orderDb = require('../../config/order_management_db/cm_order_management');
const financeDb = require('../../config/finance_management_db/cm_finance_management');

function clean(value) {
  return String(value ?? '').trim();
}

async function safeQuery(db, sql, values = []) {
  try {
    const [rows] = await db.query(sql, values);
    return rows;
  } catch {
    return [];
  }
}

function pageResult(page) {
  return {
    type: 'Page',
    name: page.page_name,
    label: page.page_name,
    sku_or_number: page.page_key,
    route: page.route_path,
  };
}

const search = asyncHandler(async (req, res) => {
  const q = clean(req.query.q || req.query.search);
  const like = `%${q}%`;
  const limit = Math.min(Math.max(Number(req.query.limit || 8), 1), 20);
  const results = [];

  const pages = await accessModel.listUserMenu(req.user);
  results.push(...pages.filter((page) => `${page.page_name} ${page.page_key} ${page.route_path}`.toLowerCase().includes(q.toLowerCase())).slice(0, limit).map(pageResult));

  if (q) {
    const localProducts = await safeQuery(productDb,
      `SELECT id, COALESCE(product_name, name, title, sku) AS name, sku
       FROM products
       WHERE sku LIKE ? OR product_name LIKE ? OR name LIKE ? OR title LIKE ?
       ORDER BY updated_at DESC LIMIT ?`,
      [like, like, like, like, limit]
    );
    results.push(...localProducts.map((row) => ({ type: 'Local Product', name: row.name, sku_or_number: row.sku, route: `/product/view/${row.id}` })));

    const inventory = await safeQuery(productDb,
      `SELECT sku, product_name, stock_qty, reserved_qty
       FROM product_inventory
       WHERE sku LIKE ? OR product_name LIKE ?
       ORDER BY updated_at DESC LIMIT ?`,
      [like, like, limit]
    );
    results.push(...inventory.map((row) => ({ type: 'Inventory', name: row.product_name || row.sku, sku_or_number: row.sku, route: `/inventory/stock-ledger?sku=${encodeURIComponent(row.sku)}` })));

    const darazProducts = await safeQuery(productDb,
      `SELECT id, product_name, seller_sku, daraz_item_id
       FROM daraz_products
       WHERE seller_sku LIKE ? OR product_name LIKE ? OR CAST(daraz_item_id AS CHAR) LIKE ?
       ORDER BY updated_at DESC LIMIT ?`,
      [like, like, like, limit]
    );
    results.push(...darazProducts.map((row) => ({ type: 'Daraz Product', name: row.product_name || row.seller_sku, sku_or_number: row.seller_sku || row.daraz_item_id, route: `/daraz-products/view/${row.id}` })));

    const wooProducts = await safeQuery(productDb,
      `SELECT account_id, woo_product_id, name, sku
       FROM woo_products
       WHERE sku LIKE ? OR name LIKE ? OR CAST(woo_product_id AS CHAR) LIKE ?
       ORDER BY updated_at DESC LIMIT ?`,
      [like, like, like, limit]
    );
    results.push(...wooProducts.map((row) => ({ type: 'Woo Product', name: row.name || row.sku, sku_or_number: row.sku || row.woo_product_id, route: `/woo-products/${row.account_id}/${row.woo_product_id}` })));

    const darazOrders = await safeQuery(productDb,
      `SELECT id, daraz_order_id, order_number, customer_name
       FROM daraz_orders
       WHERE daraz_order_id LIKE ? OR order_number LIKE ? OR customer_name LIKE ?
       ORDER BY created_at DESC LIMIT ?`,
      [like, like, like, limit]
    );
    results.push(...darazOrders.map((row) => ({ type: 'Daraz Order', name: row.customer_name || row.order_number || row.daraz_order_id, sku_or_number: row.order_number || row.daraz_order_id, route: `/daraz/orders/${row.id}` })));

    const wooOrders = await safeQuery(marketplaceDb,
      `SELECT id, woo_order_id, order_number, customer_name
       FROM woo_orders
       WHERE woo_order_id LIKE ? OR order_number LIKE ? OR customer_name LIKE ?
       ORDER BY order_date DESC LIMIT ?`,
      [like, like, like, limit]
    );
    results.push(...wooOrders.map((row) => ({ type: 'Woo Order', name: row.customer_name || row.order_number, sku_or_number: row.order_number || row.woo_order_id, route: `/woo/orders/${row.id}` })));

    const manualOrders = await safeQuery(orderDb,
      `SELECT order_id, customer_name, customer_phone
       FROM orders
       WHERE order_id LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?
       ORDER BY created_at DESC LIMIT ?`,
      [like, like, like, limit]
    );
    results.push(...manualOrders.map((row) => ({ type: 'Manual Order', name: row.customer_name || row.order_id, sku_or_number: row.order_id, route: `/manual/orders/${row.order_id}` })));

    const mappings = await safeQuery(marketplaceDb,
      `SELECT id, platform, local_sku, marketplace_sku
       FROM marketplace_sku_mappings
       WHERE local_sku LIKE ? OR marketplace_sku LIKE ?
       ORDER BY updated_at DESC LIMIT ?`,
      [like, like, limit]
    );
    results.push(...mappings.map((row) => ({ type: 'SKU Mapping', name: `${row.platform} ${row.marketplace_sku}`, sku_or_number: row.local_sku, route: `/marketplace/sku-mappings?search=${encodeURIComponent(row.marketplace_sku)}` })));

    const finance = await safeQuery(financeDb,
      `SELECT id, order_no, seller_sku, payout_amount, net_sales
       FROM daraz_finance_transactions
       WHERE order_no LIKE ? OR seller_sku LIKE ? OR transaction_id LIKE ?
       ORDER BY transaction_time DESC LIMIT ?`,
      [like, like, like, limit]
    );
    results.push(...finance.map((row) => ({ type: 'Finance', name: row.order_no || row.seller_sku, sku_or_number: row.seller_sku, route: `/daraz/finance/transactions?search=${encodeURIComponent(row.order_no || row.seller_sku || '')}` })));
  }

  return res.json({ success: true, message: 'Search completed.', data: results.slice(0, 40), rows: results.slice(0, 40) });
});

module.exports = { search };

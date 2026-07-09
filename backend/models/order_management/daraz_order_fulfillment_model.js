const { db, createGenericModel } = require("./_shared/generic_table_model");
const marketplaceDb = require("../../config/marketplace_management_db/cm_marketplace_management");

const daraz_orders = createGenericModel("daraz_orders");

// order_item_id is Daraz's own numeric ID for a purchased line — required by
// Pack, but this table's exact column name was never independently
// confirmed. Discover it once from the live schema instead of guessing, so
// a wrong guess fails loudly rather than sending garbage to Daraz.
const ITEM_ID_CANDIDATES = ["daraz_order_item_id", "order_item_id", "item_id", "daraz_item_id"];
let cachedItemIdColumn;

async function getOrderItemIdColumn() {
  if (cachedItemIdColumn !== undefined) return cachedItemIdColumn;

  const [rows] = await db.query("SHOW COLUMNS FROM daraz_order_items");
  const columnNames = new Set(rows.map((row) => row.Field));

  cachedItemIdColumn = ITEM_ID_CANDIDATES.find((name) => columnNames.has(name)) || null;
  return cachedItemIdColumn;
}

async function getOrderRow(orderId) {
  return daraz_orders.findById(orderId);
}

async function getOrderItems(orderId) {
  const [rows] = await db.query(
    "SELECT * FROM daraz_order_items WHERE daraz_order_id = ? ORDER BY id ASC",
    [orderId]
  );

  return rows;
}

// Each Daraz seller account has its own app credentials — orders only carry
// a denormalized account_name, so resolve the real marketplace account
// through that (same join shape sku_report_model.js already uses for
// marketplace listings).
async function resolveDarazAccount(accountName) {
  if (!accountName) return null;

  const [rows] = await marketplaceDb.query(
    `SELECT a.*, p.platform_code
     FROM accounts a
     INNER JOIN platforms p ON p.id = a.platform_id
     WHERE p.platform_code = 'DARAZ' AND a.account_name = ? AND a.status != 'deleted'
     LIMIT 1`,
    [accountName]
  );

  return rows[0] || null;
}

async function savePackageResult(orderId, { packageId, trackingNumber, orderStatus } = {}) {
  const payload = {};
  if (packageId !== undefined) payload.waybill_id = packageId;
  if (trackingNumber !== undefined) payload.tracking_number = trackingNumber;
  if (orderStatus !== undefined) payload.order_status = orderStatus;

  if (!Object.keys(payload).length) return getOrderRow(orderId);

  return daraz_orders.update(orderId, payload);
}

module.exports = {
  getOrderItemIdColumn,
  getOrderRow,
  getOrderItems,
  resolveDarazAccount,
  savePackageResult,
};

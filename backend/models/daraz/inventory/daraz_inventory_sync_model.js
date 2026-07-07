const crypto = require("crypto");

const productDb = require("../../../config/product_management_db/product_management_db");
const inventoryDb = require("../../../config/inventory_management_db/inventory_management_db");
const marketplaceDb = require("../../../config/marketplace_management_db/cm_marketplace_management");
const logsDb = require("../../../config/logs_management_db/logs_management_db");

let logTableReady = false;

function cleanSku(value) {
  return String(value || "").trim();
}

function toInt(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(Math.trunc(parsed), 0);
}

function makeJobUid(prefix = "daraz_inventory") {
  return `${prefix}_${Date.now()}_${crypto.randomUUID()}`;
}

async function ensureLogTable() {
  if (logTableReady) return;

  await logsDb.query(`
    CREATE TABLE IF NOT EXISTS daraz_inventory_sync_logs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      job_uid VARCHAR(120) NULL,
      account_id BIGINT UNSIGNED NULL,
      account_code VARCHAR(80) NULL,
      seller_sku VARCHAR(120) NOT NULL,
      daraz_item_id VARCHAR(80) NULL,
      daraz_sku_id VARCHAR(80) NULL,
      old_quantity INT NULL,
      new_quantity INT NOT NULL DEFAULT 0,
      source VARCHAR(80) NOT NULL DEFAULT 'inventory_update',
      sync_status VARCHAR(40) NOT NULL DEFAULT 'pending',
      message TEXT NULL,
      error_code VARCHAR(80) NULL,
      error_message TEXT NULL,
      request_id VARCHAR(120) NULL,
      trace_id VARCHAR(120) NULL,
      changed_by BIGINT UNSIGNED NULL,
      started_at DATETIME NULL,
      finished_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_daraz_inventory_sync_logs_job (job_uid),
      KEY idx_daraz_inventory_sync_logs_sku (seller_sku),
      KEY idx_daraz_inventory_sync_logs_account (account_id),
      KEY idx_daraz_inventory_sync_logs_status (sync_status),
      KEY idx_daraz_inventory_sync_logs_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  logTableReady = true;
}

async function createInventorySyncLog(payload = {}) {
  await ensureLogTable();

  await logsDb.query(
    `INSERT INTO daraz_inventory_sync_logs (
      job_uid,
      account_id,
      account_code,
      seller_sku,
      daraz_item_id,
      daraz_sku_id,
      old_quantity,
      new_quantity,
      source,
      sync_status,
      message,
      error_code,
      error_message,
      request_id,
      trace_id,
      changed_by,
      started_at,
      finished_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.job_uid || null,
      payload.account_id || null,
      payload.account_code || null,
      cleanSku(payload.seller_sku),
      payload.daraz_item_id || null,
      payload.daraz_sku_id || null,
      payload.old_quantity ?? null,
      toInt(payload.new_quantity, 0),
      payload.source || "inventory_update",
      payload.sync_status || "pending",
      payload.message || null,
      payload.error_code || null,
      payload.error_message || null,
      payload.request_id || null,
      payload.trace_id || null,
      payload.changed_by || null,
      payload.started_at || null,
      payload.finished_at || null,
    ]
  );
}

async function getLocalInventoryRows({ limit = 5000, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit || 5000), 1), 10000);
  const safeOffset = Math.max(Number(offset || 0), 0);

  const [rows] = await inventoryDb.query(
    `SELECT id, sku, stock_qty, reserved_qty, available_qty, updated_at
     FROM product_inventory
     WHERE deleted_at IS NULL
     ORDER BY updated_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset]
  );

  return rows;
}

async function findDarazListingsBySku(sku) {
  const sellerSku = cleanSku(sku);
  if (!sellerSku) return [];

  const [rows] = await productDb.query(
    `SELECT *
     FROM (
       SELECT
         dp.id AS daraz_product_row_id,
         NULL AS daraz_variant_row_id,
         dp.account_id,
         dp.daraz_item_id,
         NULL AS daraz_sku_id,
         dp.seller_sku,
         dp.quantity AS current_quantity,
         dp.price,
         dp.sale_price,
         dp.name,
         dp.main_image
       FROM daraz_products dp
       WHERE LOWER(dp.seller_sku) = LOWER(?)

       UNION ALL

       SELECT
         dp.id AS daraz_product_row_id,
         dv.id AS daraz_variant_row_id,
         dv.account_id,
         dv.daraz_item_id,
         dv.daraz_sku_id,
         dv.seller_sku,
         dv.quantity AS current_quantity,
         dv.price,
         dv.sale_price,
         COALESCE(dv.name, dp.name) AS name,
         dp.main_image
       FROM daraz_product_variants dv
       LEFT JOIN daraz_products dp
         ON dp.account_id = dv.account_id
        AND dp.daraz_item_id = dv.daraz_item_id
       WHERE LOWER(dv.seller_sku) = LOWER(?)
     ) matches
     ORDER BY account_id ASC, daraz_variant_row_id DESC`,
    [sellerSku, sellerSku]
  );

  return rows;
}

async function updateDarazMirrorStock({ account_id, seller_sku, quantity }) {
  const sku = cleanSku(seller_sku);
  const stockQty = toInt(quantity, 0);

  if (!account_id || !sku) return;

  await Promise.all([
    productDb.query(
      `UPDATE daraz_products
       SET quantity = ?,
           sync_status = 'stock_pushed',
           last_synced_at = NOW(),
           updated_at = CURRENT_TIMESTAMP
       WHERE account_id = ?
         AND LOWER(seller_sku) = LOWER(?)`,
      [stockQty, account_id, sku]
    ),
    productDb.query(
      `UPDATE daraz_product_variants
       SET quantity = ?,
           last_synced_at = NOW(),
           updated_at = CURRENT_TIMESTAMP
       WHERE account_id = ?
         AND LOWER(seller_sku) = LOWER(?)`,
      [stockQty, account_id, sku]
    ),
  ]);
}

async function touchMarketplaceInventorySync(accountId, success = true, message = null) {
  if (!accountId) return;

  await marketplaceDb.query(
    `INSERT INTO account_health (
       account_id,
       platform_code,
       connection_status,
       token_status,
       last_inventory_sync_at,
       last_error,
       success_count_today,
       error_count_today,
       last_checked_at
     ) VALUES (?, 'DARAZ', 'connected', 'valid', NOW(), ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       last_inventory_sync_at = NOW(),
       last_error = VALUES(last_error),
       success_count_today = success_count_today + VALUES(success_count_today),
       error_count_today = error_count_today + VALUES(error_count_today),
       last_checked_at = NOW(),
       updated_at = CURRENT_TIMESTAMP`,
    [accountId, success ? null : message, success ? 1 : 0, success ? 0 : 1]
  );

  await marketplaceDb.query(
    `UPDATE accounts
     SET last_sync_at = NOW(),
         last_error = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [success ? null : message, accountId]
  );
}

module.exports = {
  makeJobUid,
  cleanSku,
  toInt,
  getLocalInventoryRows,
  findDarazListingsBySku,
  updateDarazMirrorStock,
  createInventorySyncLog,
  touchMarketplaceInventorySync,
};

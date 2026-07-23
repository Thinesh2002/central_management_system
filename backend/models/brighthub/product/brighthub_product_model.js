const crypto = require("crypto");
const marketplacePool = require("../../../config/marketplace_management_db/cm_marketplace_management");
const productPool = require("../../../config/product_management_db/product_management_db");

function uid(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function json(value) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.stringify(value);
  } catch (_) {
    return null;
  }
}

function decimalOrNull(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function upsertBrightHubProduct(accountId, product) {
  const bhid = product?.bhid;

  if (!bhid) {
    throw new Error("BrightHub product BHID missing.");
  }

  await productPool.query(
    `INSERT INTO brighthub_products
      (account_id, bhid, source_product_id, sku, name, price, category_id, status,
       images_json, variant_attributes_json, raw_json, last_synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
        source_product_id = VALUES(source_product_id),
        sku = VALUES(sku),
        name = VALUES(name),
        price = VALUES(price),
        category_id = VALUES(category_id),
        status = VALUES(status),
        images_json = VALUES(images_json),
        variant_attributes_json = VALUES(variant_attributes_json),
        raw_json = VALUES(raw_json),
        last_synced_at = NOW(),
        updated_at = NOW()`,
    [
      accountId,
      bhid,
      product.id || null,
      product.sku || null,
      product.name || null,
      decimalOrNull(product.price),
      product.category_id || null,
      product.status || null,
      json(product.images),
      json(product.variant_attributes),
      json(product),
    ]
  );
}

async function createSyncJob(accountId, triggeredByType = "user") {
  const [result] = await marketplacePool.query(
    `INSERT INTO sync_jobs
      (job_uid, account_id, platform_code, sync_type, direction, status, triggered_by_type, started_at, message, created_at, updated_at)
     VALUES (?, ?, 'brighthub', 'products', 'pull', 'running', ?, NOW(), 'BrightHub product sync started', NOW(), NOW())`,
    [uid("brighthub_product_sync"), accountId, triggeredByType]
  );

  return result.insertId;
}

async function addSyncItem({
  jobId,
  accountId,
  itemType,
  localReference = null,
  marketplaceReference = null,
  sku = null,
  status = "success",
  message = null,
  errorCode = null,
  errorDetails = null,
}) {
  await marketplacePool.query(
    `INSERT INTO sync_job_items
      (job_id, account_id, item_type, local_reference, marketplace_reference, sku, status, message, error_code, error_details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [jobId, accountId, itemType, localReference, marketplaceReference, sku, status, message, errorCode, errorDetails]
  );
}

async function finishSyncJob(jobId, summary) {
  const total = Number(summary.total_records || 0);
  const success = Number(summary.success_records || 0);
  const failed = Number(summary.failed_records || 0);
  const skipped = Number(summary.skipped_records || 0);

  let status = "success";
  if (failed > 0 && success > 0) status = "partial_success";
  if (failed > 0 && success === 0) status = "failed";

  await marketplacePool.query(
    `UPDATE sync_jobs
     SET status = ?, total_records = ?, success_records = ?, failed_records = ?, skipped_records = ?,
         finished_at = NOW(), message = ?, error_details = ?, updated_at = NOW()
     WHERE id = ?`,
    [status, total, success, failed, skipped, summary.message || "BrightHub product sync completed", summary.error_details || null, jobId]
  );

  return status;
}

async function markAccountProductSync(accountId, success, errorMessage = null) {
  await marketplacePool.query(
    `UPDATE accounts SET last_sync_at = NOW(), last_error = ?, updated_at = NOW() WHERE id = ?`,
    [success ? null : errorMessage, accountId]
  );

  await marketplacePool.query(
    `INSERT INTO account_health
      (account_id, platform_code, connection_status, token_status, last_product_sync_at, error_count_today, success_count_today, last_error, last_checked_at, created_at, updated_at)
     VALUES (?, 'brighthub', ?, 'not_required', NOW(), ?, ?, ?, NOW(), NOW(), NOW())
     ON DUPLICATE KEY UPDATE
        connection_status = VALUES(connection_status),
        token_status = 'not_required',
        last_product_sync_at = IF(? = 1, NOW(), last_product_sync_at),
        error_count_today = error_count_today + VALUES(error_count_today),
        success_count_today = success_count_today + VALUES(success_count_today),
        last_error = VALUES(last_error),
        last_checked_at = NOW(),
        updated_at = NOW()`,
    [accountId, success ? "connected" : "failed", success ? 0 : 1, success ? 1 : 0, success ? null : errorMessage, success ? 1 : 0]
  );
}

async function getDueBrightHubAccounts() {
  const [rows] = await marketplacePool.query(
    `SELECT
        a.id AS account_id, a.account_name, a.account_code,
        COALESCE(s.product_sync_interval_minutes, 15) AS product_sync_interval_minutes,
        h.last_product_sync_at
     FROM accounts a
     INNER JOIN platforms p ON p.id = a.platform_id
     LEFT JOIN account_sync_settings s ON s.account_id = a.id
     LEFT JOIN account_health h ON h.account_id = a.id
     WHERE LOWER(p.platform_code) = 'brighthub'
       AND a.status = 'active'
       AND a.connection_status = 'connected'
       AND COALESCE(s.sync_products_enabled, 1) = 1
       AND (
          h.last_product_sync_at IS NULL
          OR h.last_product_sync_at <= DATE_SUB(NOW(), INTERVAL COALESCE(s.product_sync_interval_minutes, 15) MINUTE)
       )
     ORDER BY h.last_product_sync_at ASC, a.id ASC`
  );

  return rows;
}

async function listSyncedBrightHubProducts(accountId, { page = 1, limit = 50, search = "" } = {}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 5000);
  const offset = (safePage - 1) * safeLimit;

  const values = [accountId];
  let where = `WHERE account_id = ?`;

  if (search) {
    where += ` AND (name LIKE ? OR sku LIKE ? OR bhid LIKE ?)`;
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const [countRows] = await productPool.query(`SELECT COUNT(*) AS total FROM brighthub_products ${where}`, values);

  const [rows] = await productPool.query(
    `SELECT id, account_id, bhid, source_product_id, sku, name, price, category_id, status, images_json, last_synced_at, updated_at
     FROM brighthub_products
     ${where}
     ORDER BY last_synced_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...values, safeLimit, offset]
  );

  return {
    total: Number(countRows[0]?.total || 0),
    page: safePage,
    limit: safeLimit,
    data: rows,
  };
}

async function getSyncedBrightHubProductDetail(accountId, bhid) {
  const [rows] = await productPool.query(
    `SELECT * FROM brighthub_products WHERE account_id = ? AND bhid = ? LIMIT 1`,
    [accountId, bhid]
  );

  return rows[0] || null;
}

module.exports = {
  upsertBrightHubProduct,
  createSyncJob,
  addSyncItem,
  finishSyncJob,
  markAccountProductSync,
  getDueBrightHubAccounts,
  listSyncedBrightHubProducts,
  getSyncedBrightHubProductDetail,
};

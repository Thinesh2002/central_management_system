const crypto = require("crypto");

const priceDb = require("../../../config/price_management_db/price_management_db");
const logsDb = require("../../../config/logs_management_db/logs_management_db");

function cleanSku(value) {
  return String(value || "").trim();
}

function makeJobUid(prefix = "daraz_price_reconciliation") {
  return `${prefix}_${Date.now()}_${crypto.randomUUID()}`;
}

// Only SKUs with a real Daraz target price set - nothing to reconcile for
// a SKU that's never had its Daraz price configured.
async function getLocalPriceRows({ limit = 5000, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit || 5000), 1), 10000);
  const safeOffset = Math.max(Number(offset || 0), 0);

  const [rows] = await priceDb.query(
    `SELECT sku, daraz_price
     FROM product_prices
     WHERE deleted_at IS NULL
       AND status = 'active'
       AND daraz_price IS NOT NULL
       AND daraz_price > 0
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset]
  );

  return rows;
}

async function createReconciliationLog(payload = {}) {
  await logsDb.query(
    `INSERT INTO daraz_price_reconciliation_logs (
      job_uid, account_id, account_code, seller_sku, daraz_item_id, daraz_sku_id,
      old_price, new_price, source, sync_status, message, error_code, error_message,
      request_id, trace_id, changed_by, started_at, finished_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.job_uid || null,
      payload.account_id || null,
      payload.account_code || null,
      cleanSku(payload.seller_sku),
      payload.daraz_item_id || null,
      payload.daraz_sku_id || null,
      payload.old_price ?? null,
      Number(payload.new_price || 0),
      payload.source || "price_reconciliation",
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

async function listRecent({ status, seller_sku: sellerSku, limit = 200 } = {}) {
  const params = [];
  let whereSql = "WHERE 1=1";

  if (status) {
    whereSql += " AND sync_status = ?";
    params.push(status);
  }

  if (sellerSku) {
    whereSql += " AND seller_sku = ?";
    params.push(sellerSku);
  }

  const [rows] = await logsDb.query(
    `SELECT * FROM daraz_price_reconciliation_logs ${whereSql} ORDER BY id DESC LIMIT ?`,
    [...params, Number(limit)]
  );

  return rows;
}

module.exports = { cleanSku, makeJobUid, getLocalPriceRows, createReconciliationLog, listRecent };

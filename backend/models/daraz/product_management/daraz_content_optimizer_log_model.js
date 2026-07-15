const db = require("../../../config/logs_management_db/logs_management_db");

async function logScanBatch({
  account_id: accountId,
  scan_batch_id: scanBatchId,
  total,
  succeeded,
  failed,
  status = "success",
  message = null,
}) {
  await db.query(
    `INSERT INTO daraz_content_optimizer_logs
       (event_type, account_id, scan_batch_id, total, succeeded, failed, status, message)
     VALUES ('scan_batch', ?, ?, ?, ?, ?, ?, ?)`,
    [accountId, scanBatchId, total, succeeded, failed, status, message]
  );
}

async function logSectionApplied({
  account_id: accountId,
  suggestion_id: suggestionId,
  reviewed_by: reviewedBy = null,
  seller_sku: sellerSku = null,
  section,
  status = "success",
  message = null,
}) {
  await db.query(
    `INSERT INTO daraz_content_optimizer_logs
       (event_type, account_id, reviewed_by, suggestion_id, seller_sku, section, status, message)
     VALUES ('section_applied', ?, ?, ?, ?, ?, ?, ?)`,
    [accountId, reviewedBy, suggestionId, sellerSku, section, status, message]
  );
}

async function listRecent({ event_type: eventType, account_id: accountId, status, limit = 200 } = {}) {
  const params = [];
  let whereSql = "WHERE 1=1";

  if (eventType) {
    whereSql += " AND event_type = ?";
    params.push(eventType);
  }

  if (accountId) {
    whereSql += " AND account_id = ?";
    params.push(accountId);
  }

  if (status) {
    whereSql += " AND status = ?";
    params.push(status);
  }

  const [rows] = await db.query(
    `SELECT * FROM daraz_content_optimizer_logs ${whereSql} ORDER BY id DESC LIMIT ?`,
    [...params, Number(limit)]
  );

  return rows;
}

module.exports = { logScanBatch, logSectionApplied, listRecent };

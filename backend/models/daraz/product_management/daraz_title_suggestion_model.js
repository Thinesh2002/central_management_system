const db = require("../../../config/product_management_db/product_management_db");

async function create({
  account_id: accountId,
  daraz_product_id: darazProductId,
  daraz_item_id: darazItemId = null,
  seller_sku: sellerSku = null,
  original_title: originalTitle = null,
  suggested_title: suggestedTitle = null,
  reasoning = null,
  scan_batch_id: scanBatchId = null,
  created_by: createdBy = null,
}) {
  const [result] = await db.query(
    `INSERT INTO daraz_title_suggestions
       (account_id, daraz_product_id, daraz_item_id, seller_sku, original_title,
        suggested_title, reasoning, status, scan_batch_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [accountId, darazProductId, darazItemId, sellerSku, originalTitle, suggestedTitle, reasoning, scanBatchId, createdBy]
  );

  return findById(result.insertId);
}

async function createError({
  account_id: accountId,
  daraz_product_id: darazProductId,
  daraz_item_id: darazItemId = null,
  seller_sku: sellerSku = null,
  original_title: originalTitle = null,
  error_message: errorMessage,
  scan_batch_id: scanBatchId = null,
  created_by: createdBy = null,
}) {
  await db.query(
    `INSERT INTO daraz_title_suggestions
       (account_id, daraz_product_id, daraz_item_id, seller_sku, original_title,
        status, error_message, scan_batch_id, created_by)
     VALUES (?, ?, ?, ?, ?, 'failed', ?, ?, ?)`,
    [accountId, darazProductId, darazItemId, sellerSku, originalTitle, errorMessage, scanBatchId, createdBy]
  );
}

async function findById(id) {
  const [rows] = await db.query(`SELECT * FROM daraz_title_suggestions WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function list({ account_id: accountId, status, scan_batch_id: scanBatchId, limit = 200, offset = 0 } = {}) {
  const params = [];
  let whereSql = "WHERE 1=1";

  if (accountId) {
    whereSql += " AND dts.account_id = ?";
    params.push(accountId);
  }

  if (status) {
    whereSql += " AND dts.status = ?";
    params.push(status);
  }

  if (scanBatchId) {
    whereSql += " AND dts.scan_batch_id = ?";
    params.push(scanBatchId);
  }

  const [rows] = await db.query(
    `SELECT dts.*, dp.main_image AS product_image,
            COALESCE(sm.correct_sku, dts.seller_sku) AS correct_sku
     FROM daraz_title_suggestions dts
     LEFT JOIN daraz_products dp ON dp.id = dts.daraz_product_id
     LEFT JOIN sku_mappings sm ON sm.wrong_sku = dts.seller_sku
     ${whereSql}
     ORDER BY dts.id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  return rows;
}

async function updateStatus(id, { status, reviewed_by: reviewedBy = null, applied_at: appliedAt = null, error_message: errorMessage = null }) {
  await db.query(
    `UPDATE daraz_title_suggestions
     SET status = ?, reviewed_by = COALESCE(?, reviewed_by), applied_at = ?, error_message = ?
     WHERE id = ?`,
    [status, reviewedBy, appliedAt, errorMessage, id]
  );

  return findById(id);
}

async function findPendingProductIds(accountId) {
  const [rows] = await db.query(
    `SELECT DISTINCT daraz_product_id FROM daraz_title_suggestions WHERE account_id = ? AND status = 'pending'`,
    [accountId]
  );

  return new Set(rows.map((row) => row.daraz_product_id));
}

async function findRecentSuggestionProductIds({ account_id: accountId, since_date: sinceDate }) {
  const [rows] = await db.query(
    `SELECT DISTINCT daraz_product_id FROM daraz_title_suggestions WHERE account_id = ? AND created_at >= ?`,
    [accountId, sinceDate]
  );

  return new Set(rows.map((row) => row.daraz_product_id));
}

module.exports = {
  create,
  createError,
  findById,
  list,
  updateStatus,
  findPendingProductIds,
  findRecentSuggestionProductIds,
};

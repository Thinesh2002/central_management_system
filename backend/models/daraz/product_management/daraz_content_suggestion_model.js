const db = require("../../../config/product_management_db/product_management_db");

function toJson(value) {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

async function create({
  account_id: accountId,
  daraz_product_id: darazProductId,
  daraz_item_id: darazItemId = null,
  seller_sku: sellerSku = null,
  title_suggestion_id: titleSuggestionId = null,
  original_highlights: originalHighlights = null,
  suggested_highlights: suggestedHighlights = null,
  highlights_reasoning: highlightsReasoning = null,
  original_description: originalDescription = null,
  suggested_description: suggestedDescription = null,
  suggested_description_html: suggestedDescriptionHtml = null,
  description_sections: descriptionSections = null,
  extracted_features: extractedFeatures = null,
  keyword_suggestions: keywordSuggestions = null,
  attribute_validation: attributeValidation = null,
  scores = null,
  recommendations = null,
  publishing_checklist: publishingChecklist = null,
  readiness_percent: readinessPercent = null,
  scan_batch_id: scanBatchId = null,
  created_by: createdBy = null,
}) {
  const [result] = await db.query(
    `INSERT INTO daraz_content_suggestions
       (account_id, daraz_product_id, daraz_item_id, seller_sku, title_suggestion_id,
        original_highlights_json, suggested_highlights_json, highlights_reasoning,
        original_description, suggested_description, suggested_description_html, description_sections_json,
        extracted_features_json, keyword_suggestions_json, attribute_validation_json,
        scores_json, recommendations_json, publishing_checklist_json, readiness_percent,
        status, scan_batch_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [
      accountId,
      darazProductId,
      darazItemId,
      sellerSku,
      titleSuggestionId,
      toJson(originalHighlights),
      toJson(suggestedHighlights),
      highlightsReasoning,
      originalDescription,
      suggestedDescription,
      suggestedDescriptionHtml,
      toJson(descriptionSections),
      toJson(extractedFeatures),
      toJson(keywordSuggestions),
      toJson(attributeValidation),
      toJson(scores),
      toJson(recommendations),
      toJson(publishingChecklist),
      readinessPercent,
      scanBatchId,
      createdBy,
    ]
  );

  return findById(result.insertId);
}

async function createError({
  account_id: accountId,
  daraz_product_id: darazProductId,
  daraz_item_id: darazItemId = null,
  seller_sku: sellerSku = null,
  error_message: errorMessage,
  scan_batch_id: scanBatchId = null,
  created_by: createdBy = null,
}) {
  await db.query(
    `INSERT INTO daraz_content_suggestions
       (account_id, daraz_product_id, daraz_item_id, seller_sku, status, error_message, scan_batch_id, created_by)
     VALUES (?, ?, ?, ?, 'failed', ?, ?, ?)`,
    [accountId, darazProductId, darazItemId, sellerSku, errorMessage, scanBatchId, createdBy]
  );
}

async function findById(id) {
  const [rows] = await db.query(`SELECT * FROM daraz_content_suggestions WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

// Joined variant for the report detail view - plain findById() stays a
// bare row lookup since create()/updateStatus()/the apply/reject
// controllers only need daraz_content_suggestions' own columns.
async function findDetailById(id) {
  const [rows] = await db.query(
    `SELECT dcs.*, dp.name AS product_name, dp.main_image AS product_image, dp.short_description AS current_description,
            dts.suggested_title, dts.reasoning AS title_reasoning, dts.status AS title_status
     FROM daraz_content_suggestions dcs
     LEFT JOIN daraz_products dp ON dp.id = dcs.daraz_product_id
     LEFT JOIN daraz_title_suggestions dts ON dts.id = dcs.title_suggestion_id
     WHERE dcs.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function list({
  account_id: accountId,
  status,
  scan_batch_id: scanBatchId,
  limit = 200,
  offset = 0,
  since_date: sinceDate,
  exclude_seller_skus: excludeSellerSkus,
} = {}) {
  const params = [];
  let whereSql = "WHERE 1=1";

  if (accountId) {
    whereSql += " AND dcs.account_id = ?";
    params.push(accountId);
  }

  if (status) {
    whereSql += " AND dcs.status = ?";
    params.push(status);
  }

  if (scanBatchId) {
    whereSql += " AND dcs.scan_batch_id = ?";
    params.push(scanBatchId);
  }

  // "Needs Optimization" view: still-analyzed-recently but not selling -
  // same criteria the content scan job itself now uses to decide whether a
  // product stays eligible for another optimization pass.
  if (sinceDate) {
    whereSql += " AND dcs.created_at >= ?";
    params.push(sinceDate);
  }

  if (excludeSellerSkus?.length) {
    whereSql += ` AND (dcs.seller_sku IS NULL OR dcs.seller_sku NOT IN (${excludeSellerSkus.map(() => "?").join(",")}))`;
    params.push(...excludeSellerSkus);
  }

  const [rows] = await db.query(
    `SELECT dcs.*, dp.main_image AS product_image, dp.name AS product_name,
            dts.suggested_title, dts.reasoning AS title_reasoning, dts.status AS title_status
     FROM daraz_content_suggestions dcs
     LEFT JOIN daraz_products dp ON dp.id = dcs.daraz_product_id
     LEFT JOIN daraz_title_suggestions dts ON dts.id = dcs.title_suggestion_id
     ${whereSql}
     ORDER BY dcs.id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  return rows;
}

async function updateStatus(
  id,
  { status, reviewed_by: reviewedBy = null, applied_at: appliedAt = null, error_message: errorMessage = null }
) {
  await db.query(
    `UPDATE daraz_content_suggestions
     SET status = ?, reviewed_by = COALESCE(?, reviewed_by), applied_at = ?, error_message = ?
     WHERE id = ?`,
    [status, reviewedBy, appliedAt, errorMessage, id]
  );

  return findById(id);
}

async function findPendingProductIds(accountId) {
  const [rows] = await db.query(
    `SELECT DISTINCT daraz_product_id FROM daraz_content_suggestions WHERE account_id = ? AND status = 'pending'`,
    [accountId]
  );

  return new Set(rows.map((row) => row.daraz_product_id));
}

module.exports = {
  create,
  createError,
  findById,
  findDetailById,
  list,
  updateStatus,
  findPendingProductIds,
};

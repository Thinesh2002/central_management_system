const db = require("../../config/marketplace_management_db/cm_marketplace_management");

async function createSyncJob(data) {
  const [result] = await db.query(
    `
    INSERT INTO sync_jobs (
      job_uid,
      account_id,
      platform_code,
      sync_type,
      direction,
      status,
      triggered_by_type,
      triggered_by_user_id,
      started_at,
      message
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    `,
    [
      data.job_uid,
      data.account_id,
      data.platform_code,
      data.sync_type,
      data.direction || "pull",
      data.status || "running",
      data.triggered_by_type || "manual",
      data.triggered_by_user_id || null,
      data.message || null,
    ]
  );

  return result.insertId;
}

async function finishSyncJob(jobId, data) {
  await db.query(
    `
    UPDATE sync_jobs
    SET status = ?,
        total_records = ?,
        success_records = ?,
        failed_records = ?,
        skipped_records = ?,
        message = ?,
        error_details = ?,
        finished_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [
      data.status,
      data.total_records || 0,
      data.success_records || 0,
      data.failed_records || 0,
      data.skipped_records || 0,
      data.message || null,
      data.error_details || null,
      jobId,
    ]
  );
}

async function createSyncJobItem(data) {
  await db.query(
    `
    INSERT INTO sync_job_items (
      job_id,
      account_id,
      item_type,
      local_reference,
      marketplace_reference,
      sku,
      status,
      message,
      error_code,
      error_details
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.job_id,
      data.account_id,
      data.item_type,
      data.local_reference || null,
      data.marketplace_reference || null,
      data.sku || null,
      data.status || "pending",
      data.message || null,
      data.error_code || null,
      data.error_details || null,
    ]
  );
}

async function createApiRequestLog(data) {
  await db.query(
    `
    INSERT INTO api_request_logs (
      request_uid,
      account_id,
      platform_code,
      endpoint,
      http_method,
      request_type,
      response_status_code,
      api_status,
      error_code,
      error_message,
      request_summary,
      response_summary,
      request_time,
      response_time,
      duration_ms
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.request_uid,
      data.account_id || null,
      data.platform_code,
      data.endpoint,
      data.http_method,
      data.request_type || "other",
      data.response_status_code || null,
      data.api_status || "success",
      data.error_code || null,
      data.error_message || null,
      data.request_summary || null,
      data.response_summary || null,
      data.request_time || null,
      data.response_time || null,
      data.duration_ms || null,
    ]
  );
}

module.exports = {
  createSyncJob,
  finishSyncJob,
  createSyncJobItem,
  createApiRequestLog,
};
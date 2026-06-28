const authDb = require('../../config/db');

function jsonValue(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch (_) {
    return JSON.stringify({ value: String(value) });
  }
}

async function ensureAutomationLogTables() {
  await authDb.query(`
    CREATE TABLE IF NOT EXISTS automation_run_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      job_name VARCHAR(120) NOT NULL,
      job_type VARCHAR(80) NULL,
      status ENUM('success','partial','failed','skipped','running') NOT NULL DEFAULT 'success',
      checked_count INT NOT NULL DEFAULT 0,
      success_count INT NOT NULL DEFAULT 0,
      failed_count INT NOT NULL DEFAULT 0,
      skipped_count INT NOT NULL DEFAULT 0,
      summary_json JSON NULL,
      error_message TEXT NULL,
      started_at DATETIME NULL,
      finished_at DATETIME NULL,
      duration_ms INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_automation_job_created (job_name, created_at),
      KEY idx_automation_status_created (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function deriveCounts(summary = {}) {
  const checked = Number(summary.accounts || summary.checked_accounts || summary.checked || summary.total_items || summary.total_fetched || summary.fetched || 0) || 0;
  const success = Number(summary.success || summary.success_accounts || summary.inserted || summary.saved || summary.deducted || 0) || 0;
  const failed = Number(summary.failed || summary.failed_accounts || summary.failed_orders || summary.total_failed || 0) || 0;
  const skipped = summary.skipped ? 1 : Number(summary.skipped_count || summary.skipped || 0) || 0;
  return { checked, success, failed, skipped };
}

async function recordAutomationRun({ jobName, jobType = 'sync', status, summary = {}, error = null, startedAt = null }) {
  try {
    await ensureAutomationLogTables();
    const finished = new Date();
    const started = startedAt ? new Date(startedAt) : finished;
    const duration = Math.max(finished.getTime() - started.getTime(), 0);
    const counts = deriveCounts(summary || {});
    const resolvedStatus = status || (error ? 'failed' : summary?.skipped ? 'skipped' : counts.failed ? 'partial' : 'success');

    await authDb.query(
      `INSERT INTO automation_run_logs
        (job_name, job_type, status, checked_count, success_count, failed_count, skipped_count, summary_json, error_message, started_at, finished_at, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        jobName,
        jobType,
        resolvedStatus,
        counts.checked,
        counts.success,
        counts.failed,
        counts.skipped,
        jsonValue(summary || {}),
        error ? String(error.message || error) : summary?.error || null,
        started,
        finished,
        duration,
      ]
    );
  } catch (_) {
    // Automation logging must never break sync jobs.
  }
}

async function listAutomationRuns(params = {}) {
  await ensureAutomationLogTables();
  const limit = Math.min(Math.max(Number(params.limit || 100), 1), 1000);
  const values = [];
  const where = [];
  if (params.job_name) { where.push('job_name = ?'); values.push(params.job_name); }
  if (params.status) { where.push('status = ?'); values.push(params.status); }
  if (params.search) { where.push('(job_name LIKE ? OR job_type LIKE ? OR error_message LIKE ?)'); values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`); }
  if (params.date_from) { where.push('created_at >= ?'); values.push(params.date_from); }
  if (params.date_to) { where.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)'); values.push(params.date_to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await authDb.query(`SELECT * FROM automation_run_logs ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ?`, [...values, limit]);
  return rows;
}

module.exports = { ensureAutomationLogTables, recordAutomationRun, listAutomationRuns };

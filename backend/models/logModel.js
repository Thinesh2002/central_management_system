const pool = require("../config/db");
const { listAutomationRuns, ensureAutomationLogTables } = require("../services/system/automation_log_service");
const { ensureAuditTable } = require("../middleware/auditLogger");

function safeLimit(value) {
  const limit = Number(value || 100);
  if (!Number.isFinite(limit)) return 100;
  return Math.min(Math.max(limit, 1), 1000);
}

async function hasColumn(tableName, columnName) {
  try {
    const [rows] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName]);
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function ensureLogTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NULL,
      user_uid VARCHAR(80) NULL,
      user_email VARCHAR(190) NULL,
      action VARCHAR(120) NOT NULL,
      module VARCHAR(120) NOT NULL DEFAULT 'system',
      status VARCHAR(40) NOT NULL DEFAULT 'success',
      message TEXT NULL,
      ip_address VARCHAR(80) NULL,
      user_agent TEXT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_system_logs_created (created_at),
      KEY idx_system_logs_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NULL,
      login_user_id VARCHAR(80) NULL,
      email VARCHAR(190) NULL,
      login_identifier VARCHAR(190) NULL,
      action VARCHAR(120) NOT NULL DEFAULT 'login_attempt',
      status VARCHAR(40) NOT NULL DEFAULT 'failed',
      failure_reason TEXT NULL,
      message TEXT NULL,
      ip_address VARCHAR(80) NULL,
      user_agent TEXT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_login_logs_created (created_at),
      KEY idx_login_logs_user (user_id),
      KEY idx_login_logs_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureAuditTable();
  await ensureAutomationLogTables();
}

async function listLoginLogs(limit = 100) {
  await ensureLogTables();
  const loginUserExpr = (await hasColumn("login_logs", "login_user_id"))
    ? "login_user_id"
    : "NULL AS login_user_id";

  const [rows] = await pool.query(
    `
    SELECT 
      id AS row_id,
      'login' AS log_type,
      user_id,
      ${loginUserExpr},
      email,
      login_identifier,
      action,
      status,
      failure_reason,
      message,
      ip_address,
      user_agent,
      created_at
    FROM login_logs
    ORDER BY created_at DESC
    LIMIT ?
    `,
    [safeLimit(limit)]
  );

  return rows;
}

async function listSystemLogs(limit = 100) {
  await ensureLogTables();
  const [rows] = await pool.query(
    `
    SELECT 
      id AS row_id,
      'system' AS log_type,
      user_id,
      user_uid AS login_user_id,
      user_email AS email,
      NULL AS login_identifier,
      action,
      module,
      status,
      NULL AS failure_reason,
      message,
      ip_address,
      user_agent,
      created_at
    FROM system_logs
    ORDER BY created_at DESC
    LIMIT ?
    `,
    [safeLimit(limit)]
  );

  return rows;
}

async function listAuditLogs(params = {}) {
  await ensureLogTables();
  const limit = safeLimit(params.limit || 100);
  const values = [];
  const where = [];
  if (params.search) {
    where.push('(user_uid LIKE ? OR user_email LIKE ? OR module_name LIKE ? OR action_name LIKE ? OR route_path LIKE ? OR message LIKE ?)');
    values.push(...Array(6).fill(`%${params.search}%`));
  }
  if (params.module_name) { where.push('module_name = ?'); values.push(params.module_name); }
  if (params.action_name) { where.push('action_name = ?'); values.push(params.action_name); }
  if (params.status) { where.push('status = ?'); values.push(params.status); }
  if (params.date_from) { where.push('created_at >= ?'); values.push(params.date_from); }
  if (params.date_to) { where.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)'); values.push(params.date_to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM audit_logs ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ?`, [...values, limit]);
  return rows;
}

async function listAutomationLogs(params = {}) {
  return listAutomationRuns(params);
}

async function listLogs({ limit = 100 } = {}) {
  const safe = safeLimit(limit);

  const [loginLogs, systemLogs, automationLogs] = await Promise.all([
    listLoginLogs(safe).catch(() => []),
    listSystemLogs(safe).catch(() => []),
    listAutomationLogs({ limit: safe }).catch(() => []),
  ]);

  const mappedAutomation = automationLogs.map((row) => ({
    row_id: row.id,
    log_type: 'automation',
    user_id: null,
    login_user_id: null,
    email: null,
    action: row.job_name,
    module: row.job_type,
    status: row.status,
    failure_reason: row.error_message || null,
    message: `Checked: ${row.checked_count} | Success: ${row.success_count} | Failed: ${row.failed_count} | Skipped: ${row.skipped_count}`,
    ip_address: null,
    user_agent: null,
    created_at: row.created_at,
  }));

  return [...loginLogs, ...systemLogs, ...mappedAutomation]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, safe);
}

module.exports = {
  ensureLogTables,
  listLoginLogs,
  listSystemLogs,
  listAuditLogs,
  listAutomationLogs,
  listLogs,
};

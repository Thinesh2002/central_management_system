const pool = require("../config/db");

function safeLimit(value) {
  const limit = Number(value || 100);
  if (!Number.isFinite(limit)) return 100;
  return Math.min(Math.max(limit, 1), 500);
}

async function hasColumn(tableName, columnName) {
  try {
    const [rows] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName]);
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function listLoginLogs(limit = 100) {
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

async function listLogs({ limit = 100 } = {}) {
  const safe = safeLimit(limit);

  const [loginLogs, systemLogs] = await Promise.all([
    listLoginLogs(safe).catch(() => []),
    listSystemLogs(safe).catch(() => []),
  ]);

  return [...loginLogs, ...systemLogs]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, safe);
}

module.exports = { listLoginLogs, listSystemLogs, listLogs };

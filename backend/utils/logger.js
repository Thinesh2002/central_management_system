const pool = require("../config/db");

async function hasColumn(tableName, columnName) {
  try {
    const [rows] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName]);
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function writeLoginLog({
  userId = null,
  loginUserId = null,
  email = null,
  loginIdentifier = "",
  action = "login_attempt",
  status = "failed",
  failureReason = null,
  message = null,
  ip = null,
  userAgent = null,
}) {
  try {
    const supportsLoginUserId = await hasColumn("login_logs", "login_user_id");
    if (supportsLoginUserId) {
      await pool.query(
        `INSERT INTO login_logs
          (user_id, login_user_id, email, login_identifier, action, status, failure_reason, message, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, loginUserId, email, loginIdentifier || "unknown", action, status, failureReason, message, ip, userAgent]
      );
      return;
    }

    await pool.query(
      `INSERT INTO login_logs
        (user_id, email, login_identifier, action, status, failure_reason, message, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, email, loginIdentifier || "unknown", action, status, failureReason, message, ip, userAgent]
    );
  } catch {
    // Do not block login/system work because a log table is old or missing.
  }
}

async function writeSystemLog({
  userId = null,
  userUid = null,
  userEmail = null,
  action,
  module = "system",
  status = "success",
  message = null,
  ip = null,
  userAgent = null,
}) {
  try {
    await pool.query(
      `INSERT INTO system_logs
        (user_id, user_uid, user_email, action, module, status, message, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, userUid, userEmail, action, module, status, message, ip, userAgent]
    );
  } catch {
    // Keep terminal clean.
  }
}

module.exports = { writeLoginLog, writeSystemLog };

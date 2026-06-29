const pool = require("../config/logs_management_db/logs_management_db");

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
    await pool.query(
      `INSERT INTO login_logs
        (user_id, login_user_id, email, login_identifier, action, status, failure_reason, message, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        loginUserId,
        email,
        loginIdentifier || "unknown",
        action,
        status,
        failureReason,
        message,
        ip,
        userAgent,
      ]
    );
  } catch (error) {
    console.error("[LOGIN_LOG_FAIL]", error.message);
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
  } catch (error) {
    console.error("[SYSTEM_LOG_FAIL]", error.message);
  }
}

module.exports = { writeLoginLog, writeSystemLog };

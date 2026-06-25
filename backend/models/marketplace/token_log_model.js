const db = require("../../config/marketplace_management_db/cm_marketplace_management");

async function createTokenLog(data) {
  await db.query(
    `
    INSERT INTO token_logs (
      account_id,
      platform_code,
      action_type,
      old_access_token_expires_at,
      new_access_token_expires_at,
      refresh_token_expires_at,
      refresh_status,
      message,
      error_code,
      error_details
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.account_id,
      data.platform_code,
      data.action_type,
      data.old_access_token_expires_at || null,
      data.new_access_token_expires_at || null,
      data.refresh_token_expires_at || null,
      data.refresh_status || "success",
      data.message || null,
      data.error_code || null,
      data.error_details || null,
    ]
  );
}

module.exports = {
  createTokenLog,
};
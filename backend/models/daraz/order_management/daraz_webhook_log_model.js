const db = require("../../../config/logs_management_db/logs_management_db");

async function create(payload = {}) {
  const [result] = await db.query(
    `INSERT INTO daraz_webhook_logs
       (topic, msg_id, seller_id, order_id, account_id, signature_valid, status, message, raw_body)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.topic || null,
      payload.msg_id || null,
      payload.seller_id || null,
      payload.order_id || null,
      payload.account_id || null,
      payload.signature_valid === undefined || payload.signature_valid === null
        ? null
        : payload.signature_valid
        ? 1
        : 0,
      payload.status || "received",
      payload.message || null,
      payload.raw_body || null,
    ]
  );

  return result.insertId;
}

async function updateStatus(id, { status, message, account_id: accountId, signature_valid: signatureValid } = {}) {
  await db.query(
    `UPDATE daraz_webhook_logs
     SET status = ?,
         message = ?,
         account_id = COALESCE(?, account_id),
         signature_valid = COALESCE(?, signature_valid)
     WHERE id = ?`,
    [
      status,
      message || null,
      accountId || null,
      signatureValid === undefined || signatureValid === null ? null : signatureValid ? 1 : 0,
      id,
    ]
  );
}

async function listRecent({ status, limit = 200 } = {}) {
  const params = [];
  let whereSql = "WHERE 1=1";

  if (status) {
    whereSql += " AND status = ?";
    params.push(status);
  }

  const [rows] = await db.query(
    `SELECT * FROM daraz_webhook_logs ${whereSql} ORDER BY id DESC LIMIT ?`,
    [...params, Number(limit)]
  );

  return rows;
}

module.exports = { create, updateStatus, listRecent };

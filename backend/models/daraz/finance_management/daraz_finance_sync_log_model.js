const db = require("../../../config/logs_management_db/logs_management_db");

async function createSyncRun({ account_id, sync_scope, sync_type = "auto" }) {
  const [result] = await db.query(
    `INSERT INTO daraz_finance_sync_logs (account_id, sync_scope, sync_type, status, started_at)
     VALUES (?, ?, ?, 'running', NOW())`,
    [account_id, sync_scope, sync_type]
  );

  return result.insertId;
}

async function finishSyncRun({ run_id, status, total_found = null, total_saved = null, error_message = null }) {
  await db.query(
    `UPDATE daraz_finance_sync_logs
     SET status = ?, total_found = ?, total_saved = ?, error_message = ?, finished_at = NOW()
     WHERE id = ?`,
    [status, total_found, total_saved, error_message, run_id]
  );
}

async function listRuns({ account_id, sync_scope, limit = 100 } = {}) {
  const params = [];
  let whereSql = "WHERE 1=1";

  if (account_id) {
    whereSql += " AND account_id = ?";
    params.push(account_id);
  }

  if (sync_scope) {
    whereSql += " AND sync_scope = ?";
    params.push(sync_scope);
  }

  const [rows] = await db.query(
    `SELECT * FROM daraz_finance_sync_logs ${whereSql} ORDER BY id DESC LIMIT ?`,
    [...params, Number(limit)]
  );

  return rows;
}

module.exports = { createSyncRun, finishSyncRun, listRuns };

const db = require('../../config/marketplace_management_db/cm_marketplace_management');
const { listParams, clean, jsonValue } = require('../../utils/business/query_helpers');

async function create(data = {}) {
  const [result] = await db.query(
    `INSERT INTO marketplace_transfer_logs
      (platform, account_id, account_code, local_product_id, local_variant_id, local_sku, marketplace_sku, action_type, status, message, request_payload, response_payload, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      clean(data.platform || '').toUpperCase(),
      data.account_id || null,
      data.account_code || null,
      data.local_product_id || null,
      data.local_variant_id || null,
      data.local_sku || null,
      data.marketplace_sku || null,
      data.action_type || 'TRANSFER',
      data.status || 'SUCCESS',
      data.message || null,
      jsonValue(data.request_payload || {}),
      jsonValue(data.response_payload || {}),
      data.created_by || null,
    ]
  );
  return { id: result.insertId, ...data };
}

async function list(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 500);
  const where = [];
  const values = [];

  if (params.platform) { where.push('platform = ?'); values.push(clean(params.platform).toUpperCase()); }
  if (params.account_id) { where.push('account_id = ?'); values.push(params.account_id); }
  if (params.status) { where.push('status = ?'); values.push(params.status); }
  if (params.date_from) { where.push('created_at >= ?'); values.push(params.date_from); }
  if (params.date_to) { where.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)'); values.push(params.date_to); }
  if (params.search) {
    where.push('(local_sku LIKE ? OR marketplace_sku LIKE ? OR message LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT * FROM marketplace_transfer_logs ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM marketplace_transfer_logs ${whereSql}`, values);
  return { rows, pagination: { page, limit, offset, total: Number(countRow.total || 0) } };
}

module.exports = { create, list };

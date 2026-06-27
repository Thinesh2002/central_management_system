const asyncHandler = require('../../middleware/async_handler');
const marketplaceDb = require('../../config/marketplace_management_db/cm_marketplace_management');
const productDb = require('../../config/product_management_db/product_management_db');
const financeDb = require('../../config/finance_management_db/cm_finance_management');
const transferLogModel = require('../../models/marketplace/transfer_log_model');
const { listParams, clean } = require('../../utils/business/query_helpers');

const TABLES = {
  daraz_order_api: { db: productDb, table: 'daraz_order_api_logs', date: 'created_at' },
  daraz_order_sync: { db: productDb, table: 'daraz_order_sync_runs', date: 'started_at' },
  daraz_product_sync: { db: productDb, table: 'daraz_product_sync_runs', date: 'started_at' },
  daraz_finance_api: { db: marketplaceDb, table: 'api_request_logs', date: 'created_at', platform: 'DARAZ' },
  daraz_finance_sync: { db: financeDb, table: 'daraz_finance_sync_runs', date: 'started_at' },
  woo_order_sync: { db: marketplaceDb, table: 'api_request_logs', date: 'created_at', platform: 'woocommerce', requestLike: 'orders' },
  woo_product_sync: { db: marketplaceDb, table: 'api_request_logs', date: 'created_at', platform: 'woocommerce', requestLike: 'products' },
  inventory_movement: { db: productDb, table: 'inventory_stock_movements', date: 'created_at' },
};

async function getColumns(db, table) {
  const [rows] = await db.query(`SHOW COLUMNS FROM \`${table}\``).catch(() => [[]]);
  return new Set(rows.map((row) => row.Field));
}

function addEqual(where, values, columns, column, value) {
  if (value !== undefined && value !== null && value !== '' && columns.has(column)) {
    where.push(`\`${column}\` = ?`);
    values.push(value);
  }
}

function addStatus(where, values, columns, status) {
  if (!status) return;
  const statusColumns = ['status', 'api_status', 'sync_status', 'movement_type'].filter((column) => columns.has(column));
  if (!statusColumns.length) return;
  where.push(`(${statusColumns.map((column) => `\`${column}\` = ?`).join(' OR ')})`);
  values.push(...statusColumns.map(() => status));
}

function addSearch(where, values, columns, search) {
  if (!search) return;
  const searchColumns = [
    'request_uid', 'endpoint', 'request_type', 'api_status', 'status', 'sync_status',
    'error_message', 'message', 'sku', 'local_sku', 'marketplace_sku', 'seller_sku',
    'reference_id', 'order_no', 'order_number', 'account_code', 'platform_code'
  ].filter((column) => columns.has(column));
  if (!searchColumns.length) return;
  where.push(`CONCAT_WS(' ', ${searchColumns.map((column) => `\`${column}\``).join(', ')}) LIKE ?`);
  values.push(`%${search}%`);
}

async function listGeneric(def, params = {}) {
  const { page, limit, offset } = listParams(params, 25, 500);
  const columns = await getColumns(def.db, def.table);
  if (!columns.size) {
    return { rows: [], pagination: { page, limit, offset, total: 0 } };
  }

  const dateColumn = columns.has(def.date) ? def.date : (columns.has('created_at') ? 'created_at' : 'id');
  const where = [];
  const values = [];

  addEqual(where, values, columns, 'account_id', params.account_id);
  addStatus(where, values, columns, params.status);

  if (params.date_from && columns.has(dateColumn)) {
    where.push(`\`${dateColumn}\` >= ?`);
    values.push(params.date_from);
  }
  if (params.date_to && columns.has(dateColumn)) {
    where.push(`\`${dateColumn}\` < DATE_ADD(?, INTERVAL 1 DAY)`);
    values.push(params.date_to);
  }
  if (def.platform && columns.has('platform_code')) {
    where.push('UPPER(`platform_code`) = UPPER(?)');
    values.push(def.platform);
  }
  if (def.requestLike && columns.has('request_type')) {
    where.push('`request_type` LIKE ?');
    values.push(`%${def.requestLike}%`);
  }
  addSearch(where, values, columns, clean(params.search));

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = columns.has(dateColumn) ? `\`${dateColumn}\` DESC` : '`id` DESC';
  const [rows] = await def.db.query(`SELECT * FROM \`${def.table}\` ${whereSql} ORDER BY ${orderBy}, \`id\` DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
  const [[countRow]] = await def.db.query(`SELECT COUNT(*) AS total FROM \`${def.table}\` ${whereSql}`, values);
  return { rows, pagination: { page, limit, offset, total: Number(countRow.total || 0) } };
}

const list = asyncHandler(async (req, res) => {
  const type = clean(req.params.type || req.query.type || 'transfer').toLowerCase();
  const result = type === 'transfer'
    ? await transferLogModel.list(req.query || {})
    : await listGeneric(TABLES[type] || TABLES.daraz_product_sync, req.query || {});

  return res.json({ success: true, message: 'Logs loaded.', data: result.rows, rows: result.rows, pagination: result.pagination });
});

module.exports = { list };

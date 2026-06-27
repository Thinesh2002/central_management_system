const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const db = require('../../config/product_management_db/product_management_db');

function clean(value) {
  return String(value ?? '').trim();
}

function intValue(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : fallback;
}

function jsonValue(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value));
    } catch (_) {
      return JSON.stringify({ value });
    }
  }
  return JSON.stringify(value);
}

function listParams(params = {}, defaultLimit = 25, maxLimit = 300) {
  const page = Math.max(intValue(params.page, 1), 1);
  const limit = Math.min(Math.max(intValue(params.limit, defaultLimit), 1), maxLimit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex')}`;
}

async function safeQuery(sql, params = [], fallback = []) {
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (error) {
    if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR', 'ER_PARSE_ERROR'].includes(error.code)) return fallback;
    throw error;
  }
}

async function safeOne(sql, params = [], fallback = {}) {
  const rows = await safeQuery(sql, params, []);
  return rows[0] || fallback;
}

function userName(user = {}) {
  return user.name || user.full_name || user.username || user.email || null;
}

async function addAuditLog(payload = {}) {
  await safeQuery(
    `INSERT INTO audit_logs
     (request_uid, user_id, user_name, module_name, action_name, entity_type, entity_id, old_value_json, new_value_json, ip_address, user_agent, status, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.request_uid || uid('audit'),
      payload.user_id || null,
      payload.user_name || null,
      payload.module_name || 'system',
      payload.action_name || 'unknown',
      payload.entity_type || null,
      payload.entity_id || null,
      jsonValue(payload.old_value_json),
      jsonValue(payload.new_value_json),
      payload.ip_address || null,
      payload.user_agent || null,
      payload.status || 'success',
      payload.message || null,
    ]
  );
}

async function auditFromRequest(req, data = {}) {
  await addAuditLog({
    ...data,
    user_id: req.user?.id || req.user?.user_id || null,
    user_name: userName(req.user || {}),
    ip_address: req.ip || req.headers['x-forwarded-for'] || null,
    user_agent: req.headers['user-agent'] || null,
  });
}

async function dashboard() {
  const roles = await safeOne(`SELECT COUNT(*) AS total_roles FROM roles WHERE status <> 'deleted'`, [], { total_roles: 0 });
  const audit = await safeOne(
    `SELECT COUNT(*) AS audit_count, COALESCE(SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END),0) AS failed_actions
     FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    [],
    { audit_count: 0, failed_actions: 0 }
  );
  const backup = await safeOne(
    `SELECT COUNT(*) AS backup_runs, COALESCE(SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END),0) AS backup_failed
     FROM backup_runs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [],
    { backup_runs: 0, backup_failed: 0 }
  );
  const profit = await safeOne(
    `SELECT COALESCE(SUM(gross_sales),0) AS gross_sales, COALESCE(SUM(net_profit),0) AS net_profit, COALESCE(SUM(CASE WHEN status='loss' THEN 1 ELSE 0 END),0) AS loss_orders
     FROM order_profit_reports WHERE order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [],
    { gross_sales: 0, net_profit: 0, loss_orders: 0 }
  );
  const returns = await safeOne(
    `SELECT COUNT(*) AS return_count, COALESCE(SUM(refund_amount + return_shipping_cost),0) AS return_loss
     FROM return_refunds WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [],
    { return_count: 0, return_loss: 0 }
  );
  const courier = await safeOne(
    `SELECT COUNT(*) AS shipments, COALESCE(SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END),0) AS delivered, COALESCE(SUM(CASE WHEN status='returned' THEN 1 ELSE 0 END),0) AS returned
     FROM courier_shipments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [],
    { shipments: 0, delivered: 0, returned: 0 }
  );
  const bulk = await safeOne(
    `SELECT COUNT(*) AS bulk_jobs, COALESCE(SUM(CASE WHEN status IN ('failed','partial') THEN 1 ELSE 0 END),0) AS bulk_failed
     FROM bulk_jobs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [],
    { bulk_jobs: 0, bulk_failed: 0 }
  );
  const quality = await safeOne(
    `SELECT COUNT(*) AS checked_products, COALESCE(AVG(score),0) AS avg_score, COALESCE(SUM(CASE WHEN status IN ('bad','needs_work') THEN 1 ELSE 0 END),0) AS need_work
     FROM product_quality_scores`,
    [],
    { checked_products: 0, avg_score: 0, need_work: 0 }
  );
  const queue = await safeOne(
    `SELECT COUNT(*) AS queue_jobs, COALESCE(SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END),0) AS failed_queue
     FROM sync_job_queue WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    [],
    { queue_jobs: 0, failed_queue: 0 }
  );
  const recentAudit = await safeQuery(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 8`, []);
  const notifications = await safeQuery(`SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC LIMIT 8`, []);
  return { roles, audit, backup, profit, returns, courier, bulk, quality, queue, recent_audit: recentAudit, notifications };
}

async function rolesAndPermissions() {
  const roles = await safeQuery(
    `SELECT r.*, COUNT(rp.permission_id) AS permission_count
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     WHERE r.status <> 'deleted'
     GROUP BY r.id
     ORDER BY r.is_system DESC, r.role_name ASC`,
    []
  );
  const permissions = await safeQuery(
    `SELECT * FROM permissions WHERE status = 'active' ORDER BY module_name, action_name, permission_name`,
    []
  );
  const rolePermissions = await safeQuery(
    `SELECT rp.role_id, p.permission_code
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id`,
    []
  );
  return { roles, permissions, role_permissions: rolePermissions };
}

async function createRole(payload = {}, req = null) {
  const code = clean(payload.role_code || payload.code || payload.role_name).toUpperCase().replace(/\s+/g, '_');
  const name = clean(payload.role_name || payload.name);
  if (!code || !name) throw new Error('Role code and role name are required.');
  const [result] = await db.query(
    `INSERT INTO roles (role_code, role_name, description, status) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), description = VALUES(description), status = VALUES(status), updated_at = NOW()`,
    [code, name, payload.description || null, payload.status || 'active']
  );
  if (req) await auditFromRequest(req, { module_name: 'roles', action_name: 'create_or_update', entity_type: 'role', entity_id: code, new_value_json: payload, message: `Role saved: ${code}` });
  return { id: result.insertId, role_code: code, role_name: name };
}

async function updateRolePermissions(roleId, permissionCodes = [], req = null) {
  const id = intValue(roleId, 0);
  if (!id) throw new Error('role_id is required.');
  const codes = Array.isArray(permissionCodes) ? permissionCodes.map((x) => clean(x)).filter(Boolean) : [];
  const oldRows = await safeQuery(
    `SELECT p.permission_code FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ?`,
    [id]
  );
  await db.query(`DELETE FROM role_permissions WHERE role_id = ?`, [id]);
  if (codes.length) {
    const permissions = await safeQuery(`SELECT id, permission_code FROM permissions WHERE permission_code IN (?)`, [codes], []);
    for (const permission of permissions) {
      await db.query(`INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [id, permission.id]);
    }
  }
  if (req) await auditFromRequest(req, { module_name: 'roles', action_name: 'permission_update', entity_type: 'role', entity_id: id, old_value_json: oldRows, new_value_json: codes, message: 'Role permissions updated.' });
  return rolesAndPermissions();
}

async function listAuditLogs(params = {}) {
  const { page, limit, offset } = listParams(params, 30, 500);
  const where = [];
  const values = [];
  if (params.search) {
    where.push('(user_name LIKE ? OR module_name LIKE ? OR action_name LIKE ? OR entity_id LIKE ? OR message LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }
  if (params.module_name) { where.push('module_name = ?'); values.push(params.module_name); }
  if (params.action_name) { where.push('action_name = ?'); values.push(params.action_name); }
  if (params.status) { where.push('status = ?'); values.push(params.status); }
  if (params.date_from) { where.push('DATE(created_at) >= ?'); values.push(params.date_from); }
  if (params.date_to) { where.push('DATE(created_at) <= ?'); values.push(params.date_to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await safeQuery(`SELECT * FROM audit_logs ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
  const count = await safeOne(`SELECT COUNT(*) AS total FROM audit_logs ${whereSql}`, values, { total: 0 });
  return { rows, pagination: { page, limit, offset, total: Number(count.total || 0) } };
}

async function listBackups(params = {}) {
  const { page, limit, offset } = listParams(params, 20, 200);
  const rows = await safeQuery(`SELECT * FROM backup_runs ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [limit, offset]);
  const count = await safeOne(`SELECT COUNT(*) AS total FROM backup_runs`, [], { total: 0 });
  return { rows, pagination: { page, limit, offset, total: Number(count.total || 0) } };
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

async function runBackup(payload = {}, req = null) {
  const backupUid = uid('backup');
  const backupDir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const databaseName = process.env.PM_DB_NAME || process.env.DB_NAME || payload.database_name || 'central_management';
  const fileName = `${backupUid}.sql`;
  const filePath = path.join(backupDir, fileName);
  const [insert] = await db.query(
    `INSERT INTO backup_runs (backup_uid, backup_type, database_name, file_name, file_path, status, created_by, started_at)
     VALUES (?, ?, ?, ?, ?, 'running', ?, NOW())`,
    [backupUid, payload.backup_type || 'manual', databaseName, fileName, filePath, req?.user?.id || null]
  );

  const mysqldump = process.env.MYSQLDUMP_PATH || 'mysqldump';
  const args = [
    `--host=${process.env.DB_HOST || 'localhost'}`,
    `--user=${process.env.DB_USER || 'root'}`,
    `--password=${process.env.DB_PASS || ''}`,
    '--single-transaction',
    '--routines',
    '--triggers',
    databaseName,
  ];

  const result = await runCommand(mysqldump, args, { maxBuffer: 1024 * 1024 * 100 });
  if (result.error) {
    await db.query(`UPDATE backup_runs SET status='failed', message=?, finished_at=NOW() WHERE id=?`, [result.stderr || result.error.message, insert.insertId]);
    if (req) await auditFromRequest(req, { module_name: 'backup', action_name: 'run', entity_type: 'backup', entity_id: backupUid, status: 'failed', message: result.stderr || result.error.message });
    return { id: insert.insertId, backup_uid: backupUid, status: 'failed', message: result.stderr || result.error.message };
  }

  fs.writeFileSync(filePath, result.stdout || '');
  const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
  await db.query(`UPDATE backup_runs SET status='success', file_size_bytes=?, message='Backup completed successfully.', finished_at=NOW() WHERE id=?`, [fileSize, insert.insertId]);
  if (req) await auditFromRequest(req, { module_name: 'backup', action_name: 'run', entity_type: 'backup', entity_id: backupUid, message: 'Backup completed successfully.' });
  return { id: insert.insertId, backup_uid: backupUid, status: 'success', file_name: fileName, file_size_bytes: fileSize };
}

async function listMigrations(params = {}) {
  const { page, limit, offset } = listParams(params, 20, 200);
  const rows = await safeQuery(`SELECT * FROM migration_history ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [limit, offset]);
  const count = await safeOne(`SELECT COUNT(*) AS total FROM migration_history`, [], { total: 0 });
  return { rows, pagination: { page, limit, offset, total: Number(count.total || 0) } };
}

function validateMigrationSql(sqlText, allowDangerous = false) {
  const sql = clean(sqlText);
  if (!sql) throw new Error('SQL text is required.');
  if (sql.length > 200000) throw new Error('SQL is too large for web runner. Use a SQL file import.');
  if (!allowDangerous) {
    const blocked = /\b(DROP\s+DATABASE|DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM\s+users|UPDATE\s+users\s+SET|GRANT\s+|REVOKE\s+)\b/i;
    if (blocked.test(sql)) throw new Error('Dangerous SQL blocked. Run this manually after backup.');
  }
  return sql;
}

async function runMigration(payload = {}, req = null) {
  const migrationUid = uid('migration');
  const migrationName = clean(payload.migration_name || payload.name || 'Manual migration');
  const sqlText = validateMigrationSql(payload.sql_text || payload.sql, payload.allow_dangerous === true);
  const hash = crypto.createHash('sha256').update(sqlText).digest('hex');
  const [insert] = await db.query(
    `INSERT INTO migration_history (migration_uid, migration_name, sql_hash, sql_text, status, executed_by, started_at)
     VALUES (?, ?, ?, ?, 'running', ?, NOW())`,
    [migrationUid, migrationName, hash, sqlText, req?.user?.id || null]
  );
  try {
    await db.query(sqlText);
    await db.query(`UPDATE migration_history SET status='success', message='Migration completed successfully.', finished_at=NOW() WHERE id=?`, [insert.insertId]);
    if (req) await auditFromRequest(req, { module_name: 'migration', action_name: 'run', entity_type: 'migration', entity_id: migrationUid, message: migrationName });
    return { id: insert.insertId, migration_uid: migrationUid, status: 'success', migration_name: migrationName };
  } catch (error) {
    await db.query(`UPDATE migration_history SET status='failed', message=?, finished_at=NOW() WHERE id=?`, [error.message, insert.insertId]);
    if (req) await auditFromRequest(req, { module_name: 'migration', action_name: 'run', entity_type: 'migration', entity_id: migrationUid, status: 'failed', message: error.message });
    throw error;
  }
}

function calcOrderProfit(row = {}) {
  const gross = money(row.gross_sales);
  const buyerShipping = money(row.shipping_paid_by_buyer);
  const fees = money(row.marketplace_fees) + money(row.payment_fees);
  const promo = money(row.promotion_cost);
  const ppc = money(row.ppc_cost);
  const courier = money(row.courier_cost);
  const packaging = money(row.packaging_cost);
  const refund = money(row.refund_amount);
  const productCost = money(row.product_cost);
  const netSales = money(gross + buyerShipping - fees - promo - ppc - courier - packaging - refund);
  const netProfit = money(netSales - productCost);
  const margin = gross > 0 ? money((netProfit / gross) * 100) : 0;
  const status = netProfit < 0 ? 'loss' : margin < 10 ? 'low_margin' : 'profit';
  return { net_sales: netSales, net_profit: netProfit, margin_percent: margin, status };
}

async function orderProfit(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 300);
  const where = [];
  const values = [];
  if (params.search) {
    where.push('(order_number LIKE ? OR order_id LIKE ? OR account_code LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }
  if (params.order_source) { where.push('order_source = ?'); values.push(params.order_source); }
  if (params.status) { where.push('status = ?'); values.push(params.status); }
  if (params.date_from) { where.push('DATE(order_date) >= ?'); values.push(params.date_from); }
  if (params.date_to) { where.push('DATE(order_date) <= ?'); values.push(params.date_to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await safeQuery(`SELECT * FROM order_profit_reports ${whereSql} ORDER BY COALESCE(order_date, created_at) DESC, id DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
  const count = await safeOne(`SELECT COUNT(*) AS total FROM order_profit_reports ${whereSql}`, values, { total: 0 });
  const summary = await safeOne(
    `SELECT COALESCE(SUM(gross_sales),0) AS gross_sales, COALESCE(SUM(net_sales),0) AS net_sales, COALESCE(SUM(net_profit),0) AS net_profit, COALESCE(AVG(margin_percent),0) AS avg_margin, COALESCE(SUM(CASE WHEN status='loss' THEN 1 ELSE 0 END),0) AS loss_count FROM order_profit_reports ${whereSql}`,
    values,
    { gross_sales: 0, net_sales: 0, net_profit: 0, avg_margin: 0, loss_count: 0 }
  );
  return { rows, summary, pagination: { page, limit, offset, total: Number(count.total || 0) } };
}

async function saveOrderProfit(payload = {}, req = null) {
  const orderSource = clean(payload.order_source || 'MANUAL').toUpperCase();
  const orderId = clean(payload.order_id || payload.order_number || uid('order'));
  const calc = calcOrderProfit(payload);
  const [result] = await db.query(
    `INSERT INTO order_profit_reports
     (order_source, account_id, account_code, order_id, order_number, order_date, gross_sales, shipping_paid_by_buyer, marketplace_fees, payment_fees, promotion_cost, ppc_cost, courier_cost, packaging_cost, refund_amount, product_cost, net_sales, net_profit, margin_percent, status, calculated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE gross_sales=VALUES(gross_sales), shipping_paid_by_buyer=VALUES(shipping_paid_by_buyer), marketplace_fees=VALUES(marketplace_fees), payment_fees=VALUES(payment_fees), promotion_cost=VALUES(promotion_cost), ppc_cost=VALUES(ppc_cost), courier_cost=VALUES(courier_cost), packaging_cost=VALUES(packaging_cost), refund_amount=VALUES(refund_amount), product_cost=VALUES(product_cost), net_sales=VALUES(net_sales), net_profit=VALUES(net_profit), margin_percent=VALUES(margin_percent), status=VALUES(status), calculated_at=NOW(), updated_at=NOW()`,
    [orderSource, payload.account_id || null, payload.account_code || null, orderId, payload.order_number || orderId, payload.order_date || new Date(), money(payload.gross_sales), money(payload.shipping_paid_by_buyer), money(payload.marketplace_fees), money(payload.payment_fees), money(payload.promotion_cost), money(payload.ppc_cost), money(payload.courier_cost), money(payload.packaging_cost), money(payload.refund_amount), money(payload.product_cost), calc.net_sales, calc.net_profit, calc.margin_percent, calc.status]
  );
  if (req) await auditFromRequest(req, { module_name: 'order_profit', action_name: 'calculate', entity_type: 'order', entity_id: orderId, new_value_json: { ...payload, ...calc }, message: `Order profit calculated: ${orderId}` });
  return { id: result.insertId, order_id: orderId, ...calc };
}

async function listReturns(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 300);
  const where = [];
  const values = [];
  if (params.search) { where.push('(return_uid LIKE ? OR order_number LIKE ? OR local_sku LIKE ? OR reason LIKE ?)'); values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`, `%${params.search}%`); }
  if (params.status) { where.push('status = ?'); values.push(params.status); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await safeQuery(`SELECT * FROM return_refunds ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
  const count = await safeOne(`SELECT COUNT(*) AS total FROM return_refunds ${whereSql}`, values, { total: 0 });
  const summary = await safeOne(`SELECT COUNT(*) AS total_returns, COALESCE(SUM(refund_amount + return_shipping_cost),0) AS total_loss, COALESCE(SUM(restocked_qty),0) AS restocked_qty FROM return_refunds ${whereSql}`, values, { total_returns: 0, total_loss: 0, restocked_qty: 0 });
  return { rows, summary, pagination: { page, limit, offset, total: Number(count.total || 0) } };
}

async function createReturn(payload = {}, req = null) {
  const returnUid = clean(payload.return_uid || uid('return'));
  const [result] = await db.query(
    `INSERT INTO return_refunds
     (return_uid, order_source, order_id, order_number, local_sku, marketplace_sku, qty, refund_amount, return_shipping_cost, condition_status, restock, restocked_qty, reason, note, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [returnUid, clean(payload.order_source || 'MANUAL').toUpperCase(), payload.order_id || null, payload.order_number || null, clean(payload.local_sku || payload.sku).toUpperCase() || null, payload.marketplace_sku || null, intValue(payload.qty, 1), money(payload.refund_amount), money(payload.return_shipping_cost), payload.condition_status || 'unknown', payload.restock ? 1 : 0, intValue(payload.restocked_qty, 0), payload.reason || null, payload.note || null, payload.status || 'requested', req?.user?.id || null]
  );
  if (req) await auditFromRequest(req, { module_name: 'returns', action_name: 'create', entity_type: 'return', entity_id: returnUid, new_value_json: payload, message: `Return/refund created: ${returnUid}` });
  return { id: result.insertId, return_uid: returnUid };
}

async function courierDashboard(params = {}) {
  const accounts = await safeQuery(`SELECT * FROM courier_accounts WHERE status <> 'deleted' ORDER BY courier_name ASC`, []);
  const summary = await safeOne(
    `SELECT COUNT(*) AS shipments, COALESCE(SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END),0) AS delivered, COALESCE(SUM(CASE WHEN status='returned' THEN 1 ELSE 0 END),0) AS returned, COALESCE(SUM(cod_amount),0) AS cod_amount, COALESCE(SUM(collected_amount),0) AS collected_amount FROM courier_shipments`,
    [],
    { shipments: 0, delivered: 0, returned: 0, cod_amount: 0, collected_amount: 0 }
  );
  const shipments = await safeQuery(`SELECT cs.*, ca.courier_name FROM courier_shipments cs LEFT JOIN courier_accounts ca ON ca.id = cs.courier_account_id ORDER BY cs.created_at DESC LIMIT 30`, []);
  const cod = await safeQuery(`SELECT cr.*, cs.tracking_number, cs.order_number FROM cod_reconciliations cr LEFT JOIN courier_shipments cs ON cs.id = cr.shipment_id ORDER BY cr.created_at DESC LIMIT 20`, []);
  return { accounts, summary, shipments, cod };
}

async function createCourierAccount(payload = {}, req = null) {
  const code = clean(payload.courier_code || payload.code || payload.courier_name).toUpperCase().replace(/\s+/g, '_');
  const name = clean(payload.courier_name || payload.name);
  if (!code || !name) throw new Error('Courier code and name are required.');
  const [result] = await db.query(
    `INSERT INTO courier_accounts (courier_code, courier_name, api_base_url, default_service_type, status)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE courier_name=VALUES(courier_name), api_base_url=VALUES(api_base_url), default_service_type=VALUES(default_service_type), status=VALUES(status), updated_at=NOW()`,
    [code, name, payload.api_base_url || null, payload.default_service_type || null, payload.status || 'active']
  );
  if (req) await auditFromRequest(req, { module_name: 'courier', action_name: 'account_save', entity_type: 'courier_account', entity_id: code, new_value_json: payload, message: `Courier account saved: ${code}` });
  return { id: result.insertId, courier_code: code, courier_name: name };
}

async function createShipment(payload = {}, req = null) {
  const shipmentUid = clean(payload.shipment_uid || uid('shipment'));
  const [result] = await db.query(
    `INSERT INTO courier_shipments
     (shipment_uid, courier_account_id, order_source, order_id, order_number, tracking_number, waybill_url, customer_name, customer_phone, delivery_address, cod_amount, courier_cost, collected_amount, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [shipmentUid, payload.courier_account_id || null, clean(payload.order_source || 'MANUAL').toUpperCase(), payload.order_id || null, payload.order_number || null, payload.tracking_number || null, payload.waybill_url || null, payload.customer_name || null, payload.customer_phone || null, payload.delivery_address || null, money(payload.cod_amount), money(payload.courier_cost), money(payload.collected_amount), payload.status || 'draft', req?.user?.id || null]
  );
  await safeQuery(`INSERT INTO courier_shipment_status_logs (shipment_id, new_status, message, created_by) VALUES (?, ?, ?, ?)`, [result.insertId, payload.status || 'draft', 'Shipment created.', req?.user?.id || null]);
  if (req) await auditFromRequest(req, { module_name: 'courier', action_name: 'shipment_create', entity_type: 'shipment', entity_id: shipmentUid, new_value_json: payload, message: `Shipment created: ${shipmentUid}` });
  return { id: result.insertId, shipment_uid: shipmentUid };
}

async function updateShipmentStatus(id, payload = {}, req = null) {
  const shipment = await safeOne(`SELECT * FROM courier_shipments WHERE id = ? LIMIT 1`, [id], null);
  if (!shipment) throw new Error('Shipment not found.');
  const newStatus = payload.status || payload.new_status || shipment.status;
  await db.query(`UPDATE courier_shipments SET status=?, collected_amount=COALESCE(?, collected_amount), updated_at=NOW() WHERE id=?`, [newStatus, payload.collected_amount ?? null, id]);
  await db.query(`INSERT INTO courier_shipment_status_logs (shipment_id, old_status, new_status, message, raw_response_json, created_by) VALUES (?, ?, ?, ?, ?, ?)`, [id, shipment.status, newStatus, payload.message || null, jsonValue(payload.raw_response_json || payload), req?.user?.id || null]);
  if (req) await auditFromRequest(req, { module_name: 'courier', action_name: 'shipment_status', entity_type: 'shipment', entity_id: id, old_value_json: shipment, new_value_json: payload, message: `Shipment status changed: ${newStatus}` });
  return { id, old_status: shipment.status, new_status: newStatus };
}

async function bulkJobs(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 300);
  const rows = await safeQuery(`SELECT * FROM bulk_jobs ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [limit, offset]);
  const count = await safeOne(`SELECT COUNT(*) AS total FROM bulk_jobs`, [], { total: 0 });
  const summary = await safeOne(`SELECT COUNT(*) AS total_jobs, COALESCE(SUM(success_rows),0) AS success_rows, COALESCE(SUM(failed_rows),0) AS failed_rows FROM bulk_jobs`, [], { total_jobs: 0, success_rows: 0, failed_rows: 0 });
  return { rows, summary, pagination: { page, limit, offset, total: Number(count.total || 0) } };
}

async function createBulkJob(payload = {}, req = null) {
  const jobUid = clean(payload.job_uid || uid('bulk'));
  const [result] = await db.query(
    `INSERT INTO bulk_jobs (job_uid, job_type, file_name, file_path, total_rows, status, message, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [jobUid, payload.job_type || 'product_import', payload.file_name || null, payload.file_path || null, intValue(payload.total_rows, 0), payload.status || 'pending', payload.message || 'Bulk job created.', req?.user?.id || null]
  );
  if (req) await auditFromRequest(req, { module_name: 'bulk', action_name: 'create_job', entity_type: 'bulk_job', entity_id: jobUid, new_value_json: payload, message: `Bulk job created: ${jobUid}` });
  return { id: result.insertId, job_uid: jobUid, status: payload.status || 'pending' };
}

async function notifications(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 300);
  const values = [];
  const where = [];
  if (params.is_read !== undefined && params.is_read !== '') { where.push('is_read = ?'); values.push(Number(params.is_read)); }
  if (params.module_name) { where.push('module_name = ?'); values.push(params.module_name); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await safeQuery(`SELECT * FROM notifications ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
  const count = await safeOne(`SELECT COUNT(*) AS total FROM notifications ${whereSql}`, values, { total: 0 });
  return { rows, pagination: { page, limit, offset, total: Number(count.total || 0) } };
}

async function markNotificationRead(id, read = true, req = null) {
  await db.query(`UPDATE notifications SET is_read = ? WHERE id = ?`, [read ? 1 : 0, id]);
  if (req) await auditFromRequest(req, { module_name: 'notifications', action_name: read ? 'mark_read' : 'mark_unread', entity_type: 'notification', entity_id: id, message: 'Notification updated.' });
  return { id, is_read: read ? 1 : 0 };
}

async function productQuality(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 300);
  const where = [];
  const values = [];
  if (params.search) { where.push('(local_sku LIKE ? OR product_name LIKE ?)'); values.push(`%${params.search}%`, `%${params.search}%`); }
  if (params.status) { where.push('status = ?'); values.push(params.status); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await safeQuery(`SELECT * FROM product_quality_scores ${whereSql} ORDER BY score ASC, updated_at DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
  const count = await safeOne(`SELECT COUNT(*) AS total FROM product_quality_scores ${whereSql}`, values, { total: 0 });
  const summary = await safeOne(`SELECT COUNT(*) AS total_products, COALESCE(AVG(score),0) AS avg_score, COALESCE(SUM(CASE WHEN status='bad' THEN 1 ELSE 0 END),0) AS bad_count, COALESCE(SUM(CASE WHEN status='needs_work' THEN 1 ELSE 0 END),0) AS needs_work FROM product_quality_scores`, [], { total_products: 0, avg_score: 0, bad_count: 0, needs_work: 0 });
  return { rows, summary, pagination: { page, limit, offset, total: Number(count.total || 0) } };
}

async function recalculateProductQuality(req = null) {
  const rows = await safeQuery(
    `SELECT
       i.sku AS local_sku,
       COALESCE(i.product_name, p.product_name, p.name, i.sku) AS product_name,
       COALESCE(i.stock_qty,0) AS stock_qty,
       COALESCE(i.low_stock_alert_qty,5) AS low_stock_alert_qty,
       COALESCE(sp.supplier_id,0) AS supplier_id,
       COALESCE(img.image_count,0) AS image_count,
       COALESCE(listing.listing_count,0) AS listing_count,
       COALESCE(price.loss_count,0) AS loss_count
     FROM product_inventory i
     LEFT JOIN products p ON p.sku = i.sku
     LEFT JOIN (SELECT local_sku, COUNT(*) AS supplier_id FROM supplier_products WHERE status='active' GROUP BY local_sku) sp ON sp.local_sku = i.sku
     LEFT JOIN (SELECT sku, COUNT(*) AS image_count FROM product_images GROUP BY sku) img ON img.sku = i.sku
     LEFT JOIN (SELECT local_sku, COUNT(*) AS listing_count FROM marketplace_listings GROUP BY local_sku) listing ON listing.local_sku = i.sku
     LEFT JOIN (SELECT local_sku, SUM(CASE WHEN status='loss' THEN 1 ELSE 0 END) AS loss_count FROM marketplace_listing_prices GROUP BY local_sku) price ON price.local_sku = i.sku
     LIMIT 1000`,
    []
  );
  let success = 0;
  await safeQuery(`DELETE FROM product_quality_issues WHERE status='open'`, []);
  for (const row of rows) {
    const issues = [];
    const titleScore = clean(row.product_name).length >= 20 ? 15 : 8;
    const categoryScore = 10; // detailed category scoring depends on each project's product columns
    const attributeScore = 10;
    const imageScore = intValue(row.image_count, 0) > 0 ? 20 : 0;
    const stockScore = intValue(row.stock_qty, 0) > intValue(row.low_stock_alert_qty, 5) ? 15 : intValue(row.stock_qty, 0) > 0 ? 8 : 0;
    const priceScore = intValue(row.loss_count, 0) > 0 ? 0 : 15;
    const supplierScore = intValue(row.supplier_id, 0) > 0 ? 15 : 0;
    if (imageScore === 0) issues.push({ type: 'image', severity: 'high', message: 'Main/gallery image missing.', route: '/image-dashboard' });
    if (stockScore < 15) issues.push({ type: 'stock', severity: intValue(row.stock_qty, 0) <= 0 ? 'critical' : 'medium', message: 'Stock is low or out of stock.', route: '/inventory/sku-search' });
    if (priceScore === 0) issues.push({ type: 'price', severity: 'critical', message: 'Listing price is loss making.', route: '/price-dashboard' });
    if (supplierScore === 0) issues.push({ type: 'supplier', severity: 'medium', message: 'Supplier is not mapped.', route: '/suppliers' });
    if (intValue(row.listing_count, 0) === 0) issues.push({ type: 'marketplace', severity: 'medium', message: 'No marketplace listing mapped.', route: '/marketplace/transfer' });
    const score = money(titleScore + categoryScore + attributeScore + imageScore + stockScore + priceScore + supplierScore);
    const status = score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 45 ? 'needs_work' : 'bad';
    await db.query(
      `INSERT INTO product_quality_scores
       (local_sku, product_name, score, title_score, category_score, attribute_score, image_score, stock_score, price_score, supplier_score, status, issue_count, last_checked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE product_name=VALUES(product_name), score=VALUES(score), title_score=VALUES(title_score), category_score=VALUES(category_score), attribute_score=VALUES(attribute_score), image_score=VALUES(image_score), stock_score=VALUES(stock_score), price_score=VALUES(price_score), supplier_score=VALUES(supplier_score), status=VALUES(status), issue_count=VALUES(issue_count), last_checked_at=NOW(), updated_at=NOW()`,
      [row.local_sku, row.product_name, score, titleScore, categoryScore, attributeScore, imageScore, stockScore, priceScore, supplierScore, status, issues.length]
    );
    for (const issue of issues) {
      await db.query(`INSERT INTO product_quality_issues (local_sku, issue_type, severity, message, fix_route) VALUES (?, ?, ?, ?, ?)`, [row.local_sku, issue.type, issue.severity, issue.message, issue.route]);
    }
    success += 1;
  }
  if (req) await auditFromRequest(req, { module_name: 'product_quality', action_name: 'recalculate', entity_type: 'product_quality', entity_id: 'batch', message: `Product quality recalculated: ${success}` });
  return { total_checked: rows.length, success_items: success };
}

async function queues(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 300);
  const rows = await safeQuery(`SELECT * FROM sync_job_queue ORDER BY FIELD(priority,'urgent','high','normal','low'), created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
  const count = await safeOne(`SELECT COUNT(*) AS total FROM sync_job_queue`, [], { total: 0 });
  const summary = await safeOne(`SELECT COUNT(*) AS total_jobs, COALESCE(SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END),0) AS pending, COALESCE(SUM(CASE WHEN status='running' THEN 1 ELSE 0 END),0) AS running, COALESCE(SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END),0) AS failed FROM sync_job_queue`, [], { total_jobs: 0, pending: 0, running: 0, failed: 0 });
  return { rows, summary, pagination: { page, limit, offset, total: Number(count.total || 0) } };
}

async function createQueueJob(payload = {}, req = null) {
  const queueUid = clean(payload.queue_uid || uid('queue'));
  const [result] = await db.query(
    `INSERT INTO sync_job_queue (queue_uid, job_type, module_name, priority, payload_json, status, message, created_by, scheduled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [queueUid, payload.job_type || 'manual_job', payload.module_name || 'system', payload.priority || 'normal', jsonValue(payload.payload_json || payload.payload || payload), payload.status || 'pending', payload.message || 'Queue job created.', req?.user?.id || null, payload.scheduled_at || null]
  );
  if (req) await auditFromRequest(req, { module_name: 'queue', action_name: 'create_job', entity_type: 'queue_job', entity_id: queueUid, new_value_json: payload, message: `Queue job created: ${queueUid}` });
  return { id: result.insertId, queue_uid: queueUid, status: payload.status || 'pending' };
}

module.exports = {
  addAuditLog,
  auditFromRequest,
  dashboard,
  rolesAndPermissions,
  createRole,
  updateRolePermissions,
  listAuditLogs,
  listBackups,
  runBackup,
  listMigrations,
  runMigration,
  orderProfit,
  saveOrderProfit,
  listReturns,
  createReturn,
  courierDashboard,
  createCourierAccount,
  createShipment,
  updateShipmentStatus,
  bulkJobs,
  createBulkJob,
  notifications,
  markNotificationRead,
  productQuality,
  recalculateProductQuality,
  queues,
  createQueueJob,
};

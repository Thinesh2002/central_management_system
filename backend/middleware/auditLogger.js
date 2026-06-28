const authDb = require('../config/db');
const { requestInfo } = require('../utils/requestInfo');

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SKIP_PATHS = ['/api/auth/login'];

function jsonValue(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch (_) {
    return JSON.stringify({ value: String(value) });
  }
}

function cleanBody(value) {
  if (!value || typeof value !== 'object') return value || null;
  const clone = Array.isArray(value) ? [...value] : { ...value };
  ['password', 'new_password', 'old_password', 'confirm_password', 'access_token', 'refresh_token', 'app_secret', 'consumer_secret'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(clone, key)) clone[key] = '[hidden]';
  });
  return clone;
}

async function ensureAuditTable() {
  await authDb.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      request_uid VARCHAR(120) NULL,
      user_id BIGINT UNSIGNED NULL,
      user_uid VARCHAR(80) NULL,
      user_name VARCHAR(160) NULL,
      user_email VARCHAR(190) NULL,
      module_name VARCHAR(120) NOT NULL DEFAULT 'system',
      action_name VARCHAR(120) NOT NULL DEFAULT 'update',
      http_method VARCHAR(12) NULL,
      route_path VARCHAR(255) NULL,
      entity_type VARCHAR(120) NULL,
      entity_id VARCHAR(160) NULL,
      old_value_json JSON NULL,
      new_value_json JSON NULL,
      request_json JSON NULL,
      response_status INT NULL,
      status ENUM('success','failed') NOT NULL DEFAULT 'success',
      message TEXT NULL,
      ip_address VARCHAR(80) NULL,
      user_agent TEXT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_audit_user_created (user_id, created_at),
      KEY idx_audit_module_created (module_name, created_at),
      KEY idx_audit_route_created (route_path, created_at),
      KEY idx_audit_status_created (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function moduleFromPath(path = '') {
  const parts = String(path || '').split('/').filter(Boolean);
  if (parts[0] === 'api') return parts[1] || 'system';
  return parts[0] || 'system';
}

function actionFromMethod(method) {
  if (method === 'POST') return 'create';
  if (method === 'PUT' || method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  return 'view';
}

function auditLogger(req, res, next) {
  const method = String(req.method || '').toUpperCase();
  if (!MUTATION_METHODS.has(method) || SKIP_PATHS.some((path) => req.path.startsWith(path))) {
    return next();
  }

  const startedAt = Date.now();
  res.on('finish', async () => {
    try {
      await ensureAuditTable();
      const { ip, userAgent } = requestInfo(req);
      const user = req.user || {};
      const status = res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failed';
      const routePath = req.originalUrl || req.url || req.path;
      const moduleName = moduleFromPath(routePath);
      const actionName = actionFromMethod(method);
      const entityId = req.params?.id || req.params?.pageId || req.params?.userId || req.params?.sku || null;

      await authDb.query(
        `INSERT INTO audit_logs
          (request_uid, user_id, user_uid, user_name, user_email, module_name, action_name, http_method, route_path, entity_id,
           new_value_json, request_json, response_status, status, message, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.headers['x-request-id'] || `req_${startedAt}_${Math.random().toString(16).slice(2)}`,
          user.id || null,
          user.user_uid || null,
          user.name || user.full_name || null,
          user.email || null,
          moduleName,
          actionName,
          method,
          routePath,
          entityId,
          jsonValue(cleanBody(req.body)),
          jsonValue({ query: req.query || {}, params: req.params || {}, duration_ms: Date.now() - startedAt }),
          res.statusCode,
          status,
          `${method} ${routePath} ${status}`,
          ip,
          userAgent,
        ]
      );
    } catch (_) {
      // Never block responses due to audit logs.
    }
  });

  return next();
}

module.exports = { auditLogger, ensureAuditTable };

const db = require("../../../config/product_management_db");

const DEFAULT_BASE_URL = process.env.DARAZ_BASE_URL || "https://api.daraz.lk/rest";
const tableColumnCache = new Map();

const cleanUndefined = (obj = {}) => {
  const cleaned = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) cleaned[key] = obj[key];
  });
  return cleaned;
};

const toDateFromSeconds = (baseDate, seconds) => {
  if (!baseDate || !seconds) return null;
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(baseDate);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + n * 1000);
};

const safeJson = (value) => {
  try {
    if (!value) return null;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  } catch {
    return null;
  }
};

const getColumns = async (tableName = "daraz_accounts") => {
  if (tableColumnCache.has(tableName)) return tableColumnCache.get(tableName);
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  const columns = new Set(rows.map((r) => r.Field));
  tableColumnCache.set(tableName, columns);
  return columns;
};

const hasColumn = async (tableName, column) => (await getColumns(tableName)).has(column);

const pickExistingColumns = async (tableName, data) => {
  const columns = await getColumns(tableName);
  const picked = {};
  Object.keys(data).forEach((key) => {
    if (columns.has(key)) picked[key] = data[key];
  });
  return picked;
};

const normalizeTokenStatus = (row = {}) => {
  const raw = String(row.token_status || "").trim();
  if (raw && raw.toLowerCase() !== "unknown") return raw.toLowerCase();
  if (row.access_token) return row.token_expired ? "expired" : "active";
  if (row.refresh_token) return "refresh_available";
  return "missing";
};

const normalizeSyncStatus = (row = {}) => {
  if (row.sync_status) return String(row.sync_status).toLowerCase();
  if (row.status) return String(row.status).toLowerCase();
  return "active";
};

const normalizeAccountRow = (row = {}) => {
  const tokenUpdatedAt = row.token_updated_at || row.last_token_refresh_at || row.created_at || null;
  const accessExpiresAt = row.access_token_expires_at || toDateFromSeconds(tokenUpdatedAt, row.expires_in);
  const refreshExpiresAt = row.refresh_token_expires_at || toDateFromSeconds(tokenUpdatedAt, row.refresh_expires_in);

  return {
    ...row,
    account_id: row.account_id || row.id || null,
    account_code: row.account_code,
    account_name: row.account_name || row.seller_name || row.account_code,
    seller_name: row.seller_name || row.account_name || null,
    seller_id: row.seller_id || row.user_id || null,
    user_id: row.user_id || null,
    country_code: row.country_code || row.country || "LK",
    marketplace: row.marketplace || "daraz_lk",
    api_base_url: row.api_base_url || row.api_base || DEFAULT_BASE_URL,
    api_base: row.api_base || row.api_base_url || DEFAULT_BASE_URL,
    app_secret: row.app_secret || row.app_secret_encrypted || null,
    app_secret_encrypted: row.app_secret_encrypted || row.app_secret || null,
    access_token_expires_at: accessExpiresAt,
    refresh_token_expires_at: refreshExpiresAt,
    last_token_refresh_at: row.last_token_refresh_at || row.token_updated_at || null,
    last_product_sync_at: row.last_product_sync_at || row.last_sync_time || null,
    last_order_sync_at: row.last_order_sync_at || null,
    last_inventory_sync_at: row.last_inventory_sync_at || null,
    last_category_sync_at: row.last_category_sync_at || null,
    token_status: normalizeTokenStatus(row),
    sync_status: normalizeSyncStatus(row),
    token_message: row.token_message || null,
    has_access_token: !!row.access_token,
    has_refresh_token: !!row.refresh_token
  };
};

exports.normalizeAccountRow = normalizeAccountRow;
exports.getColumns = getColumns;
exports.hasColumn = hasColumn;

exports.getAllAccounts = async ({ activeOnly = false, includeTokens = true } = {}) => {
  const columns = await getColumns("daraz_accounts");
  let where = "";
  if (activeOnly && columns.has("sync_status")) where = "WHERE COALESCE(sync_status, 'active') = 'active'";

  const [rows] = await db.query(`SELECT * FROM daraz_accounts ${where} ORDER BY account_name ASC, account_code ASC`);
  const normalized = rows.map(normalizeAccountRow);
  if (includeTokens) return normalized;
  return normalized.map(({ access_token, refresh_token, app_secret, app_secret_encrypted, ...rest }) => rest);
};

exports.getAccountByCode = async (account_code) => {
  if (!account_code) throw new Error("account_code is required");
  const [rows] = await db.query(`SELECT * FROM daraz_accounts WHERE account_code = ? LIMIT 1`, [account_code]);
  return rows[0] ? normalizeAccountRow(rows[0]) : null;
};

exports.getAccountById = async (id) => {
  if (!id) throw new Error("account id is required");
  const [rows] = await db.query(`SELECT * FROM daraz_accounts WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? normalizeAccountRow(rows[0]) : null;
};

exports.getDefaultAccount = async () => {
  const columns = await getColumns("daraz_accounts");
  const where = columns.has("sync_status") ? "WHERE COALESCE(sync_status, 'active') = 'active'" : "";
  const [rows] = await db.query(`SELECT * FROM daraz_accounts ${where} ORDER BY id ASC LIMIT 1`);
  return rows[0] ? normalizeAccountRow(rows[0]) : null;
};

exports.createAccount = async (payload = {}) => {
  if (!payload.account_code) throw new Error("account_code is required");
  if (!payload.account_name && !payload.seller_name) throw new Error("account_name is required");

  const data = await pickExistingColumns("daraz_accounts", cleanUndefined({
    account_code: payload.account_code,
    account_name: payload.account_name || payload.seller_name || payload.account_code,
    seller_name: payload.seller_name || payload.account_name || null,
    seller_id: payload.seller_id || null,
    user_id: payload.user_id || null,
    country_code: payload.country_code || "LK",
    marketplace: payload.marketplace || "daraz_lk",
    api_base_url: payload.api_base_url || payload.api_base || DEFAULT_BASE_URL,
    api_base: payload.api_base || payload.api_base_url || DEFAULT_BASE_URL,
    app_key: payload.app_key || process.env.DARAZ_APP_KEY || null,
    app_secret: payload.app_secret || payload.app_secret_encrypted || null,
    app_secret_encrypted: payload.app_secret_encrypted || payload.app_secret || null,
    access_token: payload.access_token || null,
    refresh_token: payload.refresh_token || null,
    access_token_expires_at: payload.access_token_expires_at || null,
    refresh_token_expires_at: payload.refresh_token_expires_at || null,
    expires_in: payload.expires_in || null,
    refresh_expires_in: payload.refresh_expires_in || null,
    token_status: payload.access_token ? "active" : (payload.token_status || "missing"),
    token_message: payload.token_message || null,
    sync_status: payload.sync_status || "active",
    token_expired: payload.access_token ? 0 : 1,
    token_updated_at: payload.access_token ? new Date() : null,
    notes: payload.notes || null
  }));

  const columns = Object.keys(data);
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((column) => column !== "account_code")
    .map((column) => `${column} = VALUES(${column})`)
    .join(", ");

  const [result] = await db.query(
    `INSERT INTO daraz_accounts (${columns.join(", ")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
    Object.values(data)
  );

  return result.insertId || null;
};

exports.updateAccount = async (account_code, payload = {}) => {
  if (!account_code) throw new Error("account_code is required");

  const mapped = cleanUndefined({
    account_name: payload.account_name,
    seller_name: payload.seller_name,
    seller_id: payload.seller_id,
    user_id: payload.user_id,
    country_code: payload.country_code,
    marketplace: payload.marketplace,
    api_base_url: payload.api_base_url || payload.api_base,
    api_base: payload.api_base || payload.api_base_url,
    app_key: payload.app_key,
    app_secret: payload.app_secret || payload.app_secret_encrypted,
    app_secret_encrypted: payload.app_secret_encrypted || payload.app_secret,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    access_token_expires_at: payload.access_token_expires_at,
    refresh_token_expires_at: payload.refresh_token_expires_at,
    expires_in: payload.expires_in,
    refresh_expires_in: payload.refresh_expires_in,
    token_status: payload.token_status,
    token_message: payload.token_message,
    sync_status: payload.sync_status,
    token_expired: payload.token_expired,
    notes: payload.notes
  });

  const data = await pickExistingColumns("daraz_accounts", mapped);
  const updates = [];
  const values = [];
  Object.keys(data).forEach((field) => {
    updates.push(`${field} = ?`);
    values.push(data[field]);
  });

  if (updates.length === 0) return 0;
  values.push(account_code);

  const [result] = await db.query(`UPDATE daraz_accounts SET ${updates.join(", ")} WHERE account_code = ?`, values);
  return result.affectedRows;
};

exports.deleteAccount = async (account_code) => {
  if (!account_code) throw new Error("account_code is required");
  const [result] = await db.query(`DELETE FROM daraz_accounts WHERE account_code = ?`, [account_code]);
  return result.affectedRows;
};

exports.updateTokens = async (account, tokenPayload = {}) => {
  const accountId = account?.id || account?.account_id || null;
  const accountCode = account?.account_code || null;
  if (!accountId && !accountCode) throw new Error("account id or account_code is required for token update");

  const accessToken = tokenPayload.access_token || tokenPayload.accessToken || null;
  const refreshToken = tokenPayload.refresh_token || tokenPayload.refreshToken || account.refresh_token || null;
  const now = new Date();

  const accessExpiresAt = tokenPayload.access_token_expires_at
    || tokenPayload.accessTokenExpiresAt
    || (tokenPayload.expires_in ? new Date(now.getTime() + Number(tokenPayload.expires_in) * 1000) : null);
  const refreshExpiresAt = tokenPayload.refresh_token_expires_at
    || tokenPayload.refreshTokenExpiresAt
    || (tokenPayload.refresh_expires_in ? new Date(now.getTime() + Number(tokenPayload.refresh_expires_in) * 1000) : null);

  const data = await pickExistingColumns("daraz_accounts", {
    access_token: accessToken,
    refresh_token: refreshToken,
    access_token_expires_at: accessExpiresAt,
    refresh_token_expires_at: refreshExpiresAt,
    expires_in: tokenPayload.expires_in || null,
    refresh_expires_in: tokenPayload.refresh_expires_in || null,
    last_token_refresh_at: now,
    token_updated_at: now,
    token_expired: 0,
    token_status: "active",
    token_message: "Daraz seller account connected successfully. Tokens were saved.",
  });

  const updates = [];
  const values = [];
  Object.keys(data).forEach((field) => {
    if (data[field] !== null && data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  });

  const whereSql = accountId ? "id = ?" : "account_code = ?";
  values.push(accountId || accountCode);
  const [result] = await db.query(`UPDATE daraz_accounts SET ${updates.join(", ")} WHERE ${whereSql}`, values);
  return result.affectedRows;
};

exports.markTokenStatus = async (account, status = "reauth_required", message = null) => {
  const accountId = account?.id || account?.account_id || null;
  const accountCode = account?.account_code || null;
  if (!accountId && !accountCode) return 0;

  const data = await pickExistingColumns("daraz_accounts", {
    token_status: status,
    token_message: message || status,
    token_expired: ["expired", "reauth_required", "refresh_failed", "missing"].includes(String(status)) ? 1 : 0,
    last_token_check_at: new Date()
  });

  const updates = Object.keys(data).map((field) => `${field} = ?`);
  if (!updates.length) return 0;

  const whereSql = accountId ? "id = ?" : "account_code = ?";
  const values = [...Object.values(data), accountId || accountCode];
  const [result] = await db.query(`UPDATE daraz_accounts SET ${updates.join(", ")} WHERE ${whereSql}`, values);
  return result.affectedRows;
};

exports.updateLastSync = async (account, syncField) => {
  const accountId = account?.id || account?.account_id || null;
  const accountCode = account?.account_code || null;
  if (!accountId && !accountCode) return 0;

  const preferred = {
    last_product_sync_at: { last_product_sync_at: new Date(), last_sync_time: new Date() },
    last_order_sync_at: { last_order_sync_at: new Date() },
    last_inventory_sync_at: { last_inventory_sync_at: new Date() },
    last_category_sync_at: { last_category_sync_at: new Date() }
  }[syncField] || { last_sync_time: new Date() };

  const data = await pickExistingColumns("daraz_accounts", preferred);
  if (!Object.keys(data).length) return 0;

  const updates = Object.keys(data).map((field) => `${field} = ?`);
  const whereSql = accountId ? "id = ?" : "account_code = ?";
  const values = [...Object.values(data), accountId || accountCode];
  const [result] = await db.query(`UPDATE daraz_accounts SET ${updates.join(", ")} WHERE ${whereSql}`, values);
  return result.affectedRows;
};

exports.createTokenLog = async ({ account, action, status, message = null, error = null, tokenPayload = null }) => {
  try {
    const exists = await getColumns("daraz_token_logs").then(() => true).catch(() => false);
    if (!exists) return null;

    const data = await pickExistingColumns("daraz_token_logs", {
      account_id: account?.id || account?.account_id || null,
      account_code: account?.account_code || null,
      action,
      status,
      old_access_token_expires_at: account?.access_token_expires_at || null,
      new_access_token_expires_at: tokenPayload?.access_token_expires_at || null,
      old_refresh_token_expires_at: account?.refresh_token_expires_at || null,
      new_refresh_token_expires_at: tokenPayload?.refresh_token_expires_at || null,
      message,
      error_json: error ? safeJson({ name: error.name, message: error.message, response: error.response?.data || error.responseData || null }) : null,
      created_at: new Date()
    });

    const columns = Object.keys(data);
    const placeholders = columns.map(() => "?").join(", ");
    const [result] = await db.query(`INSERT INTO daraz_token_logs (${columns.join(", ")}) VALUES (${placeholders})`, Object.values(data));
    return result.insertId;
  } catch (logError) {
    console.error("[DARAZ_TOKEN_LOG_FAIL]:", logError.message);
    return null;
  }
};

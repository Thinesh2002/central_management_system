const db = require("../../../config/product_management_db");

const cleanUndefined = (obj = {}) => {
  const cleaned = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) cleaned[key] = obj[key];
  });
  return cleaned;
};

exports.getAllAccounts = async ({ activeOnly = true, includeTokens = true } = {}) => {
  const fields = includeTokens
    ? `id, account_code, account_name, seller_id, user_id, country_code, marketplace, api_base_url,
       app_key, app_secret_encrypted AS app_secret, access_token, refresh_token,
       access_token_expires_at, refresh_token_expires_at, token_status, sync_status,
       last_product_sync_at, last_order_sync_at, last_inventory_sync_at, last_category_sync_at`
    : `id, account_code, account_name, seller_id, user_id, country_code, marketplace, api_base_url,
       token_status, sync_status, last_product_sync_at, last_order_sync_at, last_inventory_sync_at, last_category_sync_at`;

  const where = activeOnly ? "WHERE sync_status = 'active'" : "";

  const [rows] = await db.query(`
    SELECT ${fields}
    FROM daraz_accounts
    ${where}
    ORDER BY account_name ASC
  `);

  return rows;
};

exports.getAccountByCode = async (account_code) => {
  if (!account_code) throw new Error("account_code is required");

  const [rows] = await db.query(
    `
    SELECT id, account_code, account_name, seller_id, user_id, country_code, marketplace, api_base_url,
           app_key, app_secret_encrypted AS app_secret, access_token, refresh_token,
           access_token_expires_at, refresh_token_expires_at, token_status, sync_status,
           last_product_sync_at, last_order_sync_at, last_inventory_sync_at, last_category_sync_at
    FROM daraz_accounts
    WHERE account_code = ?
    LIMIT 1
    `,
    [account_code]
  );

  return rows[0] || null;
};

exports.getAccountById = async (id) => {
  if (!id) throw new Error("account id is required");

  const [rows] = await db.query(
    `
    SELECT id, account_code, account_name, seller_id, user_id, country_code, marketplace, api_base_url,
           app_key, app_secret_encrypted AS app_secret, access_token, refresh_token,
           access_token_expires_at, refresh_token_expires_at, token_status, sync_status,
           last_product_sync_at, last_order_sync_at, last_inventory_sync_at, last_category_sync_at
    FROM daraz_accounts
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
};

exports.getDefaultAccount = async () => {
  const [rows] = await db.query(`
    SELECT id, account_code, account_name, seller_id, user_id, country_code, marketplace, api_base_url,
           app_key, app_secret_encrypted AS app_secret, access_token, refresh_token,
           access_token_expires_at, refresh_token_expires_at, token_status, sync_status
    FROM daraz_accounts
    WHERE sync_status = 'active'
    ORDER BY id ASC
    LIMIT 1
  `);

  return rows[0] || null;
};

exports.createAccount = async (payload) => {
  const data = cleanUndefined({
    account_code: payload.account_code,
    account_name: payload.account_name,
    seller_id: payload.seller_id || null,
    user_id: payload.user_id || null,
    country_code: payload.country_code || "LK",
    marketplace: payload.marketplace || "daraz_lk",
    api_base_url: payload.api_base_url || process.env.DARAZ_BASE_URL || "https://api.daraz.lk/rest",
    app_key: payload.app_key || null,
    app_secret_encrypted: payload.app_secret || payload.app_secret_encrypted || null,
    access_token: payload.access_token || null,
    refresh_token: payload.refresh_token || null,
    access_token_expires_at: payload.access_token_expires_at || null,
    refresh_token_expires_at: payload.refresh_token_expires_at || null,
    token_status: payload.access_token ? "active" : "missing",
    sync_status: payload.sync_status || "active",
    notes: payload.notes || null
  });

  const columns = Object.keys(data);
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((column) => column !== "account_code")
    .map((column) => `${column} = VALUES(${column})`)
    .join(", ");

  const [result] = await db.query(
    `
    INSERT INTO daraz_accounts (${columns.join(", ")})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates}
    `,
    Object.values(data)
  );

  return result.insertId || null;
};

exports.updateAccount = async (account_code, payload = {}) => {
  if (!account_code) throw new Error("account_code is required");

  const allowedFields = [
    "account_name", "seller_id", "user_id", "country_code", "marketplace", "api_base_url",
    "app_key", "app_secret_encrypted", "access_token", "refresh_token",
    "access_token_expires_at", "refresh_token_expires_at", "token_status", "sync_status", "notes"
  ];

  const data = cleanUndefined(payload);
  const updates = [];
  const values = [];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  });

  if (data.app_secret) {
    updates.push("app_secret_encrypted = ?");
    values.push(data.app_secret);
  }

  if (updates.length === 0) return 0;

  values.push(account_code);

  const [result] = await db.query(
    `UPDATE daraz_accounts SET ${updates.join(", ")} WHERE account_code = ?`,
    values
  );

  return result.affectedRows;
};

exports.updateTokens = async (account, tokenPayload = {}) => {
  const accountId = account?.id || null;
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

  const whereSql = accountId ? "id = ?" : "account_code = ?";
  const whereValue = accountId || accountCode;

  const [result] = await db.query(
    `
    UPDATE daraz_accounts
    SET access_token = COALESCE(?, access_token),
        refresh_token = COALESCE(?, refresh_token),
        access_token_expires_at = COALESCE(?, access_token_expires_at),
        refresh_token_expires_at = COALESCE(?, refresh_token_expires_at),
        last_token_refresh_at = NOW(),
        token_status = 'active'
    WHERE ${whereSql}
    `,
    [accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, whereValue]
  );

  return result.affectedRows;
};

exports.markTokenStatus = async (account, status = "reauth_required") => {
  const accountId = account?.id || null;
  const accountCode = account?.account_code || null;
  if (!accountId && !accountCode) return 0;

  const whereSql = accountId ? "id = ?" : "account_code = ?";
  const whereValue = accountId || accountCode;

  const [result] = await db.query(
    `UPDATE daraz_accounts SET token_status = ? WHERE ${whereSql}`,
    [status, whereValue]
  );

  return result.affectedRows;
};

exports.updateLastSync = async (account, syncField) => {
  const allowed = new Set([
    "last_product_sync_at",
    "last_order_sync_at",
    "last_inventory_sync_at",
    "last_category_sync_at"
  ]);

  if (!allowed.has(syncField)) return 0;

  const accountId = account?.id || null;
  const accountCode = account?.account_code || null;
  if (!accountId && !accountCode) return 0;

  const whereSql = accountId ? "id = ?" : "account_code = ?";
  const whereValue = accountId || accountCode;

  const [result] = await db.query(
    `UPDATE daraz_accounts SET ${syncField} = NOW() WHERE ${whereSql}`,
    [whereValue]
  );

  return result.affectedRows;
};

exports.createTokenLog = async ({ account, action, status, message = null, error = null, tokenPayload = null }) => {
  const errorJson = error
    ? JSON.stringify({ name: error.name, message: error.message, stack: error.stack, response: error.response?.data || null })
    : null;

  const [result] = await db.query(
    `
    INSERT INTO daraz_token_logs (
      account_id, account_code, action, status,
      new_access_token_expires_at, new_refresh_token_expires_at,
      message, error_json, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      account?.id || null,
      account?.account_code || null,
      action,
      status,
      tokenPayload?.access_token_expires_at || null,
      tokenPayload?.refresh_token_expires_at || null,
      message,
      errorJson
    ]
  );

  return result.insertId;
};

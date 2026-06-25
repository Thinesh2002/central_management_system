const db = require("../../config/marketplace_management_db/cm_marketplace_management");

function cleanValue(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  return value;
}

function cleanString(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).trim();
}

function normalizePlatformCode(platformCode) {
  return String(platformCode || "DARAZ").trim().toUpperCase();
}

async function findPlatformByCode(platformCode) {
  const code = normalizePlatformCode(platformCode);

  const [rows] = await db.query(
    `
    SELECT *
    FROM platforms
    WHERE platform_code = ?
    LIMIT 1
    `,
    [code]
  );

  return rows[0] || null;
}

async function createAccount(data) {
  const platformCode = normalizePlatformCode(data.platform_code);
  const platform = await findPlatformByCode(platformCode);

  if (!platform) {
    throw new Error(`Invalid platform code: ${platformCode}`);
  }

  const accountUid = cleanString(data.account_uid);
  const accountName = cleanString(data.account_name);
  const accountCode = cleanString(data.account_code);

  if (!accountUid) {
    throw new Error("account_uid is required");
  }

  if (!accountName) {
    throw new Error("account_name is required");
  }

  const [result] = await db.query(
    `
    INSERT INTO accounts (
      account_uid,
      platform_id,
      account_name,
      account_code,
      country_code,
      seller_id,
      seller_email,
      store_url,
      api_base_url,
      is_sandbox,
      status,
      connection_status,
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      accountUid,
      platform.id,
      accountName,
      accountCode,
      cleanString(data.country_code, "LK"),
      cleanString(data.seller_id),
      cleanString(data.seller_email),
      cleanString(data.store_url),
      cleanString(data.api_base_url),
      data.is_sandbox ? 1 : 0,
      cleanString(data.status, "active"),
      cleanString(data.connection_status, "connected"),
      cleanValue(data.created_by),
    ]
  );

  const accountId = result.insertId;

  if (!accountId) {
    throw new Error("Account created but insertId not returned");
  }

  return {
    id: accountId,
    account_id: accountId,
    insertId: accountId,
    account_uid: accountUid,
    platform_id: platform.id,
    platform_code: platform.platform_code,
    platform_name: platform.platform_name,
    account_name: accountName,
    account_code: accountCode,
    country_code: cleanString(data.country_code, "LK"),
    seller_id: cleanString(data.seller_id),
    seller_email: cleanString(data.seller_email),
    store_url: cleanString(data.store_url),
    api_base_url: cleanString(data.api_base_url),
    is_sandbox: data.is_sandbox ? 1 : 0,
    status: cleanString(data.status, "active"),
    connection_status: cleanString(data.connection_status, "connected"),
    created_by: cleanValue(data.created_by),
  };
}

async function getAllAccounts(filters = {}) {
  const params = [];
  let whereSql = `WHERE a.status != 'deleted'`;

  if (filters.platform_code) {
    whereSql += ` AND p.platform_code = ?`;
    params.push(normalizePlatformCode(filters.platform_code));
  }

  const [rows] = await db.query(
    `
    SELECT 
      a.*,
      p.platform_code,
      p.platform_name,
      h.token_status,
      h.last_product_sync_at,
      h.last_order_sync_at,
      h.last_inventory_sync_at,
      h.error_count_today,
      h.success_count_today,
      h.last_checked_at
    FROM accounts a
    INNER JOIN platforms p ON p.id = a.platform_id
    LEFT JOIN account_health h ON h.account_id = a.id
    ${whereSql}
    ORDER BY a.id DESC
    `,
    params
  );

  return rows;
}

async function getAccountById(accountId) {
  if (!accountId) {
    throw new Error("account_id is required");
  }

  const [rows] = await db.query(
    `
    SELECT 
      a.*,
      p.platform_code,
      p.platform_name,
      h.token_status,
      h.last_product_sync_at,
      h.last_order_sync_at,
      h.last_inventory_sync_at,
      h.error_count_today,
      h.success_count_today,
      h.last_checked_at
    FROM accounts a
    INNER JOIN platforms p ON p.id = a.platform_id
    LEFT JOIN account_health h ON h.account_id = a.id
    WHERE a.id = ?
    LIMIT 1
    `,
    [accountId]
  );

  return rows[0] || null;
}

async function getActiveDarazAccounts() {
  const [rows] = await db.query(
    `
    SELECT 
      a.*,
      p.platform_code,
      p.platform_name,
      h.token_status,
      h.last_product_sync_at,
      h.last_order_sync_at,
      h.last_inventory_sync_at,
      h.error_count_today,
      h.success_count_today,
      h.last_checked_at
    FROM accounts a
    INNER JOIN platforms p ON p.id = a.platform_id
    LEFT JOIN account_health h ON h.account_id = a.id
    WHERE p.platform_code = 'DARAZ'
      AND a.status IN ('active', 'token_expired', 'reauthorization_required')
      AND a.connection_status != 'paused'
    ORDER BY a.id ASC
    `
  );

  return rows;
}

async function findById(accountId) {
  return getAccountById(accountId);
}

async function listActiveDarazAccounts() {
  return getActiveDarazAccounts();
}

async function updateAccountStatus(
  accountId,
  status,
  connectionStatus,
  lastError = null
) {
  if (!accountId) {
    throw new Error("account_id is required for updating account status");
  }

  await db.query(
    `
    UPDATE accounts
    SET status = ?,
        connection_status = ?,
        last_error = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [
      cleanString(status, "inactive"),
      cleanString(connectionStatus, "not_connected"),
      lastError,
      accountId,
    ]
  );
}

async function updateLastSync(accountId) {
  if (!accountId) {
    throw new Error("account_id is required for updating last sync");
  }

  await db.query(
    `
    UPDATE accounts
    SET last_sync_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [accountId]
  );
}

async function upsertAccountHealth(accountId, platformCode, data = {}) {
  if (!accountId) {
    throw new Error("account_id is required for account health");
  }

  await db.query(
    `
    INSERT INTO account_health (
      account_id,
      platform_code,
      connection_status,
      token_status,
      last_error,
      last_checked_at
    )
    VALUES (?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      connection_status = VALUES(connection_status),
      token_status = VALUES(token_status),
      last_error = VALUES(last_error),
      last_checked_at = NOW(),
      updated_at = CURRENT_TIMESTAMP
    `,
    [
      accountId,
      normalizePlatformCode(platformCode),
      cleanString(data.connection_status, "not_connected"),
      cleanString(data.token_status, "not_created"),
      data.last_error || null,
    ]
  );
}

async function deleteAccount(accountId) {
  if (!accountId) {
    throw new Error("account_id is required for deleting account");
  }

  await db.query(
    `
    UPDATE accounts
    SET status = 'deleted',
        connection_status = 'deleted',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [accountId]
  );
}

module.exports = {
  findPlatformByCode,
  createAccount,

  getAllAccounts,
  getAccountById,
  getActiveDarazAccounts,

  findById,
  listActiveDarazAccounts,

  updateAccountStatus,
  updateLastSync,
  upsertAccountHealth,
  deleteAccount,
};
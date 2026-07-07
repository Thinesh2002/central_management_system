const crypto = require("crypto");
const pool = require("../../../config/marketplace_management_db/cm_marketplace_management");
function uid(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function safeString(value) {
  return String(value || "").trim();
}

function maskSecretSafe(value) {
  const text = String(value || "");

  if (!text) return "";

  if (text.length <= 8) {
    return `${text.slice(0, 2)}****${text.slice(-2)}`;
  }

  return `${text.slice(0, 6)}****${text.slice(-4)}`;
}

function jsonString(value) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.stringify(value);
  } catch (_) {
    return null;
  }
}

async function getWooPlatformId(connection = pool) {
  const [rows] = await connection.query(
    `SELECT id
     FROM platforms
     WHERE LOWER(platform_code) IN ('woocommerce', 'woo')
     LIMIT 1`
  );

  if (rows.length) return rows[0].id;

  const [result] = await connection.query(
    `INSERT INTO platforms
      (
        platform_code,
        platform_name,
        status
      )
     VALUES
      ('woocommerce', 'WooCommerce', 'active')`
  );

  return result.insertId;
}

async function createOrUpdateWooAccount(payload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const platformId = await getWooPlatformId(connection);

    const accountCode = safeString(payload.account_code);
    const accountName = safeString(payload.account_name);
    const countryCode = safeString(payload.country_code) || "LK";
    const storeUrl = safeString(payload.store_url);
    const consumerKey = safeString(payload.consumer_key);
    const consumerSecret = safeString(payload.consumer_secret);

    if (!accountCode) throw new Error("Account code is required.");
    if (!accountName) throw new Error("Account name is required.");
    if (!storeUrl) throw new Error("Store URL is required.");
    if (!consumerKey) throw new Error("Consumer key is required.");
    if (!consumerSecret) throw new Error("Consumer secret is required.");

    const [existing] = await connection.query(
      `SELECT
          id,
          account_uid
       FROM accounts
       WHERE platform_id = ?
         AND account_code = ?
       LIMIT 1`,
      [platformId, accountCode]
    );

    let accountId;
    let accountUid;

    if (existing.length) {
      accountId = existing[0].id;
      accountUid = existing[0].account_uid;

      await connection.query(
        `UPDATE accounts
         SET account_name = ?,
             country_code = ?,
             store_url = ?,
             status = 'active',
             connection_status = 'connected',
             last_connected_at = NOW(),
             last_error = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [accountName, countryCode, storeUrl, accountId]
      );
    } else {
      accountUid = uid("woo_acc");

      const [result] = await connection.query(
        `INSERT INTO accounts
          (
            account_uid,
            platform_id,
            account_name,
            account_code,
            country_code,
            store_url,
            is_sandbox,
            status,
            connection_status,
            last_connected_at,
            created_at,
            updated_at
          )
         VALUES
          (?, ?, ?, ?, ?, ?, 0, 'active', 'connected', NOW(), NOW(), NOW())`,
        [
          accountUid,
          platformId,
          accountName,
          accountCode,
          countryCode,
          storeUrl,
        ]
      );

      accountId = result.insertId;
    }

    await connection.query(
      `INSERT INTO account_credentials
        (
          account_id,
          credential_type,
          consumer_key,
          consumer_secret,
          token_status,
          last_validated_at,
          credentials_version,
          created_at,
          updated_at
        )
       VALUES
        (?, 'woocommerce_keys', ?, ?, 'valid', NOW(), 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
          credential_type = 'woocommerce_keys',
          consumer_key = VALUES(consumer_key),
          consumer_secret = VALUES(consumer_secret),
          token_status = 'valid',
          last_validated_at = NOW(),
          credentials_version = credentials_version + 1,
          updated_at = NOW()`,
      [accountId, consumerKey, consumerSecret]
    );

    await connection.query(
      `INSERT INTO account_health
        (
          account_id,
          platform_code,
          connection_status,
          token_status,
          error_count_today,
          success_count_today,
          last_error,
          last_checked_at,
          created_at,
          updated_at
        )
       VALUES
        (?, 'woocommerce', 'connected', 'not_required', 0, 1, NULL, NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE
          platform_code = 'woocommerce',
          connection_status = 'connected',
          token_status = 'not_required',
          success_count_today = success_count_today + 1,
          last_error = NULL,
          last_checked_at = NOW(),
          updated_at = NOW()`,
      [accountId]
    );

    await connection.query(
      `INSERT INTO account_sync_settings
        (
          account_id,
          sync_products_enabled,
          sync_inventory_enabled,
          sync_price_enabled,
          sync_images_enabled,
          product_sync_interval_minutes,
          inventory_sync_interval_minutes,
          price_sync_interval_minutes,
          auto_token_refresh_enabled,
          token_refresh_before_minutes,
          created_at,
          updated_at
        )
       VALUES
        (?, 1, 1, 1, 1, 15, 30, 30, 0, 0, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
          sync_products_enabled = VALUES(sync_products_enabled),
          product_sync_interval_minutes = VALUES(product_sync_interval_minutes),
          updated_at = NOW()`,
      [accountId]
    );

    await connection.commit();

    return {
      account_id: accountId,
      account_uid: accountUid,
      account_code: accountCode,
      account_name: accountName,
      country_code: countryCode,
      store_url: storeUrl,
      connection_status: "connected",
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listWooAccounts() {
  const [rows] = await pool.query(
    `SELECT
        a.id,
        a.id AS account_id,
        a.account_uid,
        a.platform_id,
        a.account_name,
        a.account_code,
        a.country_code,
        a.seller_id,
        a.seller_email,
        a.store_url,
        a.api_base_url,
        a.is_sandbox,
        a.status,
        a.connection_status,
        a.last_connected_at,
        a.last_sync_at,
        a.last_error,
        a.created_by,
        a.created_at,
        a.updated_at,

        p.platform_code,
        p.platform_name,

        c.credential_type,
        c.consumer_key,
        c.token_status AS credential_token_status,
        c.last_validated_at,

        h.connection_status AS health_connection_status,
        h.token_status AS health_token_status,
        h.last_product_sync_at,
          h.last_checked_at,
        h.error_count_today,
        h.success_count_today,
        h.last_error AS health_last_error
     FROM accounts a
     INNER JOIN platforms p ON p.id = a.platform_id
     LEFT JOIN account_credentials c
       ON c.account_id = a.id
      AND c.credential_type = 'woocommerce_keys'
     LEFT JOIN account_health h
       ON h.account_id = a.id
     WHERE LOWER(p.platform_code) IN ('woocommerce', 'woo')
     ORDER BY a.id DESC`
  );

  return rows.map((row) => {
    let consumerKey = "";

    try {
      if (row.consumer_key) {
        consumerKey = row.consumer_key;
      }
    } catch (_) {
      consumerKey = "";
    }

    return {
      id: row.id,
      account_id: row.account_id,
      account_uid: row.account_uid,
      platform_id: row.platform_id,
      platform_code: row.platform_code,
      platform_name: row.platform_name,
      account_name: row.account_name,
      account_code: row.account_code,
      country_code: row.country_code,
      seller_id: row.seller_id,
      seller_email: row.seller_email,
      store_url: row.store_url,
      api_base_url: row.api_base_url,
      is_sandbox: row.is_sandbox,
      status: row.status,
      connection_status: row.connection_status,
      health_connection_status: row.health_connection_status,
      token_status:
        row.health_token_status ||
        row.credential_token_status ||
        "not_required",
      credential_type: row.credential_type,
      consumer_key: maskSecretSafe(consumerKey),
      last_connected_at: row.last_connected_at,
      last_sync_at: row.last_sync_at,
      last_product_sync_at: row.last_product_sync_at,
      last_checked_at: row.last_checked_at,
      last_validated_at: row.last_validated_at,
      error_count_today: row.error_count_today,
      success_count_today: row.success_count_today,
      last_error: row.last_error || row.health_last_error,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}

async function getWooCredentials(accountId) {
  const [rows] = await pool.query(
    `SELECT
        a.id AS account_id,
        a.account_name,
        a.account_code,
        a.store_url,
        c.consumer_key,
        c.consumer_secret
     FROM accounts a
     INNER JOIN platforms p ON p.id = a.platform_id
     INNER JOIN account_credentials c
       ON c.account_id = a.id
      AND c.credential_type = 'woocommerce_keys'
     WHERE a.id = ?
       AND LOWER(p.platform_code) IN ('woocommerce', 'woo')
     LIMIT 1`,
    [accountId]
  );

  if (!rows.length) {
    throw new Error("WooCommerce account credentials not found.");
  }

  const row = rows[0];

  return {
    account_id: row.account_id,
    account_name: row.account_name,
    account_code: row.account_code,
    store_url: row.store_url,
    consumer_key: row.consumer_key,
    consumer_secret: row.consumer_secret,
  };
}

async function markWooConnection(accountId, success, message = null) {
  await pool.query(
    `UPDATE accounts
     SET connection_status = ?,
         status = ?,
         last_connected_at = ?,
         last_error = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [
      success ? "connected" : "failed",
      success ? "active" : "inactive",
      success ? new Date() : null,
      success ? null : message,
      accountId,
    ]
  );

  await pool.query(
    `INSERT INTO account_health
      (
        account_id,
        platform_code,
        connection_status,
        token_status,
        error_count_today,
        success_count_today,
        last_error,
        last_checked_at,
        created_at,
        updated_at
      )
     VALUES
      (?, 'woocommerce', ?, 'not_required', ?, ?, ?, NOW(), NOW(), NOW())
     ON DUPLICATE KEY UPDATE
        platform_code = 'woocommerce',
        connection_status = VALUES(connection_status),
        token_status = 'not_required',
        error_count_today = error_count_today + VALUES(error_count_today),
        success_count_today = success_count_today + VALUES(success_count_today),
        last_error = VALUES(last_error),
        last_checked_at = NOW(),
        updated_at = NOW()`,
    [
      accountId,
      success ? "connected" : "failed",
      success ? 0 : 1,
      success ? 1 : 0,
      success ? null : message,
    ]
  );
}

async function logApiRequest({
  account_id = null,
  endpoint = null,
  http_method = "GET",
  request_type = "other",
  response_status_code = null,
  api_status = "success",
  error_code = null,
  error_message = null,
  request_summary = null,
  response_summary = null,
  request_time = null,
  response_time = null,
  duration_ms = null,
}) {
  try {
    await pool.query(
      `INSERT INTO api_request_logs
        (
          request_uid,
          account_id,
          platform_code,
          endpoint,
          http_method,
          request_type,
          response_status_code,
          api_status,
          error_code,
          error_message,
          request_summary,
          response_summary,
          request_time,
          response_time,
          duration_ms,
          created_at
        )
       VALUES
        (?, ?, 'woocommerce', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        uid("woo_req"),
        account_id,
        endpoint,
        http_method,
        request_type,
        response_status_code,
        api_status,
        error_code,
        error_message,
        jsonString(request_summary),
        jsonString(response_summary),
        request_time,
        response_time,
        duration_ms,
      ]
    );
  } catch (error) {
    console.error("[WOO_API_LOG_FAIL]:", error.message);
  }
}

module.exports = {
  createOrUpdateWooAccount,
  listWooAccounts,
  getWooCredentials,
  markWooConnection,
  logApiRequest,
};
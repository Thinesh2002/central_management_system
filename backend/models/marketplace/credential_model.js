const db = require("../../config/marketplace_management_db/cm_marketplace_management");

const TABLE_NAME = "account_credentials";
const DARAZ_CREDENTIAL_TYPE = "daraz_oauth";
const WOO_CREDENTIAL_TYPE = "woocommerce_keys";

function plainValue(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function normalizeCredential(row) {
  if (!row) return null;

  return {
    ...row,

    // Daraz normal field names
    app_key: plainValue(row.app_key),
    app_secret: plainValue(row.app_secret),
    access_token: plainValue(row.access_token),
    refresh_token: plainValue(row.refresh_token),

    // WooCommerce normal field names
    consumer_key: plainValue(row.consumer_key),
    consumer_secret: plainValue(row.consumer_secret),

    // Common status alias
    status: row.token_status || null,
  };
}

function resolveAccountId(accountIdOrData, data) {
  if (
    typeof accountIdOrData === "number" ||
    typeof accountIdOrData === "string"
  ) {
    return {
      account_id: accountIdOrData,
      ...(data || {}),
    };
  }

  return accountIdOrData || {};
}

async function createCredentials(data) {
  if (!data.account_id) {
    throw new Error("account_id is required for creating credentials.");
  }

  const [result] = await db.query(
    `
    INSERT INTO ${TABLE_NAME} (
      account_id,
      credential_type,
      app_key,
      app_secret,
      access_token,
      refresh_token,
      consumer_key,
      consumer_secret,
      access_token_expires_at,
      refresh_token_expires_at,
      token_status,
      last_refreshed_at,
      credentials_version
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    `,
    [
      data.account_id,
      data.credential_type || DARAZ_CREDENTIAL_TYPE,

      plainValue(data.app_key),
      plainValue(data.app_secret),
      plainValue(data.access_token),
      plainValue(data.refresh_token),

      plainValue(data.consumer_key),
      plainValue(data.consumer_secret),

      data.access_token_expires_at || null,
      data.refresh_token_expires_at || null,
      data.token_status || data.status || "valid",
      data.credentials_version || 1,
    ]
  );

  return result.insertId;
}

async function getCredentialsByAccountId(accountId) {
  return getCredentialsByAccountIdAndType(accountId, DARAZ_CREDENTIAL_TYPE);
}

async function getCredentialsByAccountIdAndType(accountId, credentialType) {
  if (!accountId) {
    throw new Error("account_id is required for loading credentials.");
  }

  const [rows] = await db.query(
    `
    SELECT
      id,
      account_id,
      credential_type,
      app_key,
      app_secret,
      access_token,
      refresh_token,
      consumer_key,
      consumer_secret,
      access_token_expires_at,
      refresh_token_expires_at,
      token_status,
      last_refreshed_at,
      last_validated_at,
      credentials_version,
      created_at,
      updated_at
    FROM ${TABLE_NAME}
    WHERE account_id = ?
      AND credential_type = ?
    LIMIT 1
    `,
    [accountId, credentialType || DARAZ_CREDENTIAL_TYPE]
  );

  return normalizeCredential(rows[0] || null);
}

async function findByAccountId(accountId) {
  return getCredentialsByAccountId(accountId);
}

async function getCredentialByAccountId(accountId) {
  return getCredentialsByAccountId(accountId);
}

async function getDecryptedCredentials(accountId) {
  // Compatibility function name.
  // Current DB uses plain column names.
  return getCredentialsByAccountId(accountId);
}

async function updateTokens(accountId, data = {}) {
  if (!accountId) {
    throw new Error("account_id is required for updating tokens.");
  }

  await db.query(
    `
    UPDATE ${TABLE_NAME}
    SET access_token = ?,
        refresh_token = ?,
        access_token_expires_at = ?,
        refresh_token_expires_at = ?,
        token_status = ?,
        last_refreshed_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
    WHERE account_id = ?
      AND credential_type = ?
    `,
    [
      plainValue(data.access_token),
      plainValue(data.refresh_token),
      data.access_token_expires_at || null,
      data.refresh_token_expires_at || null,
      data.token_status || data.status || "valid",
      accountId,
      data.credential_type || DARAZ_CREDENTIAL_TYPE,
    ]
  );
}

async function updateDarazTokens(accountId, data = {}) {
  return updateTokens(accountId, {
    ...data,
    credential_type: DARAZ_CREDENTIAL_TYPE,
  });
}

async function updateAccessToken(accountId, data = {}) {
  if (!accountId) {
    throw new Error("account_id is required for updating access token.");
  }

  await db.query(
    `
    UPDATE ${TABLE_NAME}
    SET access_token = ?,
        access_token_expires_at = ?,
        token_status = ?,
        last_refreshed_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
    WHERE account_id = ?
      AND credential_type = ?
    `,
    [
      plainValue(data.access_token),
      data.access_token_expires_at || null,
      data.token_status || data.status || "valid",
      accountId,
      data.credential_type || DARAZ_CREDENTIAL_TYPE,
    ]
  );
}

async function updateCredentialStatus(
  accountId,
  status,
  credentialType = DARAZ_CREDENTIAL_TYPE
) {
  if (!accountId) {
    throw new Error("account_id is required for updating credential status.");
  }

  await db.query(
    `
    UPDATE ${TABLE_NAME}
    SET token_status = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE account_id = ?
      AND credential_type = ?
    `,
    [status, accountId, credentialType]
  );
}

async function updateTokenStatus(accountId, status) {
  return updateCredentialStatus(accountId, status, DARAZ_CREDENTIAL_TYPE);
}

async function updateLastValidated(
  accountId,
  credentialType = DARAZ_CREDENTIAL_TYPE
) {
  if (!accountId) {
    throw new Error("account_id is required for updating last validated time.");
  }

  await db.query(
    `
    UPDATE ${TABLE_NAME}
    SET last_validated_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
    WHERE account_id = ?
      AND credential_type = ?
    `,
    [accountId, credentialType]
  );
}

async function upsertCredentials(accountIdOrData, maybeData = null) {
  const data = resolveAccountId(accountIdOrData, maybeData);

  if (!data.account_id) {
    throw new Error("account_id is required for account_credentials.");
  }

  const credentialType = data.credential_type || DARAZ_CREDENTIAL_TYPE;

  const existing = await getCredentialsByAccountIdAndType(
    data.account_id,
    credentialType
  );

  if (existing) {
    await db.query(
      `
      UPDATE ${TABLE_NAME}
      SET app_key = ?,
          app_secret = ?,
          access_token = ?,
          refresh_token = ?,
          consumer_key = ?,
          consumer_secret = ?,
          access_token_expires_at = ?,
          refresh_token_expires_at = ?,
          token_status = ?,
          last_refreshed_at = NOW(),
          credentials_version = credentials_version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
        AND credential_type = ?
      `,
      [
        plainValue(data.app_key || existing.app_key),
        plainValue(data.app_secret || existing.app_secret),
        plainValue(data.access_token || existing.access_token),
        plainValue(data.refresh_token || existing.refresh_token),

        plainValue(data.consumer_key || existing.consumer_key),
        plainValue(data.consumer_secret || existing.consumer_secret),

        data.access_token_expires_at || existing.access_token_expires_at || null,
        data.refresh_token_expires_at ||
          existing.refresh_token_expires_at ||
          null,

        data.token_status || data.status || existing.token_status || "valid",

        data.account_id,
        credentialType,
      ]
    );

    return existing.id;
  }

  return createCredentials({
    ...data,
    credential_type: credentialType,
  });
}

/**
 * Supports both:
 * upsertDarazCredentials({ account_id, app_key, app_secret })
 * upsertDarazCredentials(accountId, { app_key, app_secret })
 */
async function upsertDarazCredentials(accountIdOrData, maybeData = null) {
  const data = resolveAccountId(accountIdOrData, maybeData);

  return upsertCredentials({
    ...data,
    credential_type: DARAZ_CREDENTIAL_TYPE,
  });
}

async function upsertWooCredentials(accountIdOrData, maybeData = null) {
  const data = resolveAccountId(accountIdOrData, maybeData);

  return upsertCredentials({
    ...data,
    credential_type: WOO_CREDENTIAL_TYPE,
    token_status: data.token_status || data.status || "valid",
  });
}

async function deleteCredentialsByAccountId(
  accountId,
  credentialType = DARAZ_CREDENTIAL_TYPE
) {
  if (!accountId) {
    throw new Error("account_id is required for deleting credentials.");
  }

  await db.query(
    `
    DELETE FROM ${TABLE_NAME}
    WHERE account_id = ?
      AND credential_type = ?
    `,
    [accountId, credentialType]
  );
}

module.exports = {
  createCredentials,

  getCredentialsByAccountId,
  getCredentialsByAccountIdAndType,
  getDecryptedCredentials,
  findByAccountId,
  getCredentialByAccountId,

  updateTokens,
  updateDarazTokens,
  updateAccessToken,
  updateCredentialStatus,
  updateTokenStatus,
  updateLastValidated,

  upsertCredentials,
  upsertDarazCredentials,
  upsertWooCredentials,

  deleteCredentialsByAccountId,
};
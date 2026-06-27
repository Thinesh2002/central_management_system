const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");
const marketplaceDb = require("../../../config/marketplace_management_db/cm_marketplace_management");

const darazApiService = require("../../marketplace/daraz_api_service");

function cleanCode(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim().toUpperCase();
}

function plainValue(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim();
}

function pickDarazFunction() {
  if (typeof darazApiService.callDarazApi === "function") {
    return darazApiService.callDarazApi;
  }

  if (typeof darazApiService.requestDarazApi === "function") {
    return darazApiService.requestDarazApi;
  }

  if (typeof darazApiService.darazApiRequest === "function") {
    return darazApiService.darazApiRequest;
  }

  if (typeof darazApiService.makeDarazApiRequest === "function") {
    return darazApiService.makeDarazApiRequest;
  }

  if (typeof darazApiService.sendDarazRequest === "function") {
    return darazApiService.sendDarazRequest;
  }

  if (typeof darazApiService === "function") {
    return darazApiService;
  }

  const error = new Error(
    "Daraz API function missing in services/marketplace/daraz_api_service.js"
  );
  error.statusCode = 500;
  error.code = "DARAZ_API_FUNCTION_MISSING";
  throw error;
}

async function findAccountFromModel(accountCode) {
  const code = cleanCode(accountCode);
  if (!code) return null;

  const functionNames = [
    "getAccountByCode",
    "findByCode",
    "getByCode",
    "findAccountByCode",
    "getMarketplaceAccountByCode",
  ];

  for (const fnName of functionNames) {
    if (typeof accountModel[fnName] === "function") {
      const byCleanCode = await accountModel[fnName](code);
      if (byCleanCode) return byCleanCode;

      const byOriginalCode = await accountModel[fnName](accountCode);
      if (byOriginalCode) return byOriginalCode;
    }
  }

  return null;
}

async function findAccountDirect(accountCode) {
  const code = cleanCode(accountCode);
  if (!code) return null;

  try {
    const [rows] = await marketplaceDb.query(
      `
      SELECT
        a.*,
        p.platform_code,
        p.platform_name
      FROM accounts a
      LEFT JOIN platforms p ON p.id = a.platform_id
      WHERE UPPER(TRIM(a.account_code)) = ?
        AND (
          p.platform_code IS NULL
          OR UPPER(TRIM(p.platform_code)) = 'DARAZ'
        )
      LIMIT 1
      `,
      [code]
    );

    if (rows[0]) return rows[0];
  } catch (error) {
    console.error("[DARAZ_ORDER_ACCOUNT_PLATFORM_QUERY_FAIL]", {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }

  const [rows] = await marketplaceDb.query(
    `
    SELECT *
    FROM accounts
    WHERE UPPER(TRIM(account_code)) = ?
    LIMIT 1
    `,
    [code]
  );

  return rows[0] || null;
}

async function listDarazAccounts() {
  try {
    const [rows] = await marketplaceDb.query(
      `
      SELECT
        a.id,
        a.account_code,
        a.account_name,
        a.status,
        a.connection_status,
        p.platform_code,
        c.credential_type,
        c.token_status,
        c.access_token_expires_at,
        c.refresh_token_expires_at,
        CASE WHEN c.app_key IS NULL OR c.app_key = '' THEN 0 ELSE 1 END AS has_app_key,
        CASE WHEN c.app_secret IS NULL OR c.app_secret = '' THEN 0 ELSE 1 END AS has_app_secret,
        CASE WHEN c.access_token IS NULL OR c.access_token = '' THEN 0 ELSE 1 END AS has_access_token,
        CASE WHEN c.refresh_token IS NULL OR c.refresh_token = '' THEN 0 ELSE 1 END AS has_refresh_token
      FROM accounts a
      LEFT JOIN platforms p ON p.id = a.platform_id
      LEFT JOIN account_credentials c
        ON c.account_id = a.id
        AND c.credential_type = 'daraz_oauth'
      WHERE p.platform_code IS NULL
         OR UPPER(TRIM(p.platform_code)) = 'DARAZ'
      ORDER BY a.account_code ASC
      `
    );

    return rows;
  } catch (error) {
    const [rows] = await marketplaceDb.query(
      `
      SELECT
        id,
        account_code,
        account_name,
        status,
        connection_status
      FROM accounts
      ORDER BY account_code ASC
      `
    );

    return rows;
  }
}

async function findAccount(accountCode) {
  const code = cleanCode(accountCode);

  if (!code) {
    const error = new Error("account_code is required");
    error.statusCode = 400;
    error.code = "ACCOUNT_CODE_REQUIRED";
    throw error;
  }

  const accountFromModel = await findAccountFromModel(code);
  if (accountFromModel) return accountFromModel;

  const accountFromDb = await findAccountDirect(code);
  if (accountFromDb) return accountFromDb;

  const availableAccounts = await listDarazAccounts();

  const error = new Error(
    `Daraz account not found for account_code: ${accountCode}. Available accounts: ${
      availableAccounts.map((a) => a.account_code).join(", ") || "none"
    }`
  );

  error.statusCode = 404;
  error.code = "DARAZ_ACCOUNT_NOT_FOUND";
  error.availableAccounts = availableAccounts.map((a) => a.account_code);
  throw error;
}

async function findCredentials(accountId) {
  if (!accountId) {
    const error = new Error("account_id missing for credentials lookup");
    error.statusCode = 400;
    error.code = "ACCOUNT_ID_MISSING";
    throw error;
  }

  let credentials = null;

  if (typeof credentialModel.getCredentialsByAccountId === "function") {
    credentials = await credentialModel.getCredentialsByAccountId(accountId);
  }

  if (!credentials && typeof credentialModel.getCredentialByAccountId === "function") {
    credentials = await credentialModel.getCredentialByAccountId(accountId);
  }

  if (!credentials && typeof credentialModel.findByAccountId === "function") {
    credentials = await credentialModel.findByAccountId(accountId);
  }

  if (!credentials && typeof credentialModel.getDecryptedCredentials === "function") {
    credentials = await credentialModel.getDecryptedCredentials(accountId);
  }

  if (!credentials) {
    const error = new Error(`Daraz credentials not found for account_id: ${accountId}`);
    error.statusCode = 404;
    error.code = "DARAZ_CREDENTIALS_NOT_FOUND";
    throw error;
  }

  return credentials;
}

async function resolveAccountWithCredentials(accountCodeOrAccount) {
  const account =
    typeof accountCodeOrAccount === "object" && accountCodeOrAccount !== null
      ? accountCodeOrAccount
      : await findAccount(accountCodeOrAccount);

  const accountId = account.id || account.account_id;

  const credentials = await findCredentials(accountId);

  const appKey = plainValue(credentials.app_key || credentials.appKey);
  const appSecret = plainValue(credentials.app_secret || credentials.appSecret);
  const accessToken = plainValue(credentials.access_token || credentials.accessToken);
  const refreshToken = plainValue(credentials.refresh_token || credentials.refreshToken);

  if (!appKey || !appSecret || !accessToken) {
    const error = new Error(
      `Daraz credentials incomplete for account_code: ${account.account_code}`
    );

    error.statusCode = 400;
    error.code = "DARAZ_CREDENTIALS_INCOMPLETE";
    error.details = {
      account_id: accountId,
      account_code: account.account_code,
      has_app_key: Boolean(appKey),
      has_app_secret: Boolean(appSecret),
      has_access_token: Boolean(accessToken),
      has_refresh_token: Boolean(refreshToken),
    };

    throw error;
  }

  const normalizedCredentials = {
    ...credentials,

    id: credentials.id || credentials.credential_id || null,
    account_id: accountId,
    credential_type: credentials.credential_type || "daraz_oauth",

    app_key: appKey,
    app_secret: appSecret,
    access_token: accessToken,
    refresh_token: refreshToken,

    appKey,
    appSecret,
    accessToken,
    refreshToken,

    token_status: credentials.token_status || credentials.status || "valid",
    status: credentials.token_status || credentials.status || "valid",

    access_token_expires_at: credentials.access_token_expires_at || null,
    refresh_token_expires_at: credentials.refresh_token_expires_at || null,
  };

  const normalizedAccount = {
    ...account,

    id: accountId,
    account_id: accountId,
    account_code: account.account_code,
    accountCode: account.account_code,

    platform_code: account.platform_code || "DARAZ",

    app_key: appKey,
    app_secret: appSecret,
    access_token: accessToken,
    refresh_token: refreshToken,

    // Compatibility aliases for older services
    app_key_encrypted: appKey,
    app_secret_encrypted: appSecret,
    access_token_encrypted: accessToken,
    refresh_token_encrypted: refreshToken,

    credential_id: normalizedCredentials.id,
    credential_type: normalizedCredentials.credential_type,
    token_status: normalizedCredentials.token_status,

    access_token_expires_at: normalizedCredentials.access_token_expires_at,
    refresh_token_expires_at: normalizedCredentials.refresh_token_expires_at,

    credentials: normalizedCredentials,
    credential: normalizedCredentials,

    credentials_ready: true,
    has_app_key: true,
    has_app_secret: true,
    has_access_token: true,
    has_refresh_token: Boolean(refreshToken),
  };

  return normalizedAccount;
}

async function callDarazApi(options = {}) {
  const {
    account_code,
    account,
    endpoint,
    api_path,
    apiPath,
    path,
    method = "GET",
    params = {},
    query = {},
    body = null,
    data = null,
    request_type,
    requestType,
  } = options;

  const finalApiPath = apiPath || api_path || endpoint || path;

  if (!finalApiPath) {
    const error = new Error("Daraz API path missing in order adapter");
    error.statusCode = 400;
    error.code = "DARAZ_ORDER_API_PATH_MISSING";
    error.debug = {
      received_keys: Object.keys(options),
      apiPath,
      api_path,
      endpoint,
      path,
    };
    throw error;
  }

  const resolvedAccount = await resolveAccountWithCredentials(
    account || account_code
  );

  const fn = pickDarazFunction();

  const finalQuery = {
    ...(query || {}),
    ...(params || {}),
  };

  const finalBody = body || data || null;

  const payload = {
    // Your existing marketplace/daraz_api_service.js expects these exact names
    account: resolvedAccount,
    credentials: resolvedAccount.credentials,

    apiPath: finalApiPath,
    requestType: requestType || request_type || "daraz_order_request",

    method,
    query: finalQuery,
    body: finalBody,
  };


  return fn(payload);
}

module.exports = {
  callDarazApi,
  findAccount,
  findCredentials,
  resolveAccountWithCredentials,
  listDarazAccounts,
};
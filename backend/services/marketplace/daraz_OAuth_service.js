const accountModel = require("../../models/marketplace/account_model");
const credentialModel = require("../../models/marketplace/credential_model");
const tokenLogModel = require("../../models/marketplace/token_log_model");
const darazApiService = require("./daraz_api_service");

function createServiceError(message, statusCode = 400, code = "TOKEN_SERVICE_ERROR") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getDarazOAuthBaseUrl(account) {
  const countryCode = String(account?.country_code || "LK").toUpperCase();

  const oauthUrls = {
    LK: "https://api.daraz.lk/oauth/authorize",
    PK: "https://api.daraz.pk/oauth/authorize",
    BD: "https://api.daraz.com.bd/oauth/authorize",
    NP: "https://api.daraz.com.np/oauth/authorize",
    MM: "https://api.shop.com.mm/oauth/authorize",
  };

  return oauthUrls[countryCode] || oauthUrls.LK;
}

function encodeState(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeState(state) {
  return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
}

function addSeconds(seconds) {
  return new Date(Date.now() + Number(seconds || 0) * 1000);
}

function getRedirectUri() {
  return (
    process.env.DARAZ_REAUTH_CALLBACK_URL ||
    process.env.DARAZ_REDIRECT_URI ||
    "https://www.system.teckvora.com/daraz/callback"
  );
}

async function getAccountByIdSafe(accountId) {
  if (typeof accountModel.getAccountById === "function") {
    return accountModel.getAccountById(accountId);
  }

  if (typeof accountModel.findById === "function") {
    return accountModel.findById(accountId);
  }

  if (typeof accountModel.getById === "function") {
    return accountModel.getById(accountId);
  }

  throw createServiceError(
    "account_model.js missing account getter function. Need getAccountById(accountId).",
    500,
    "ACCOUNT_GETTER_MISSING"
  );
}

async function getCredentialByAccountIdSafe(accountId) {
  if (typeof credentialModel.getDecryptedCredentials === "function") {
    return credentialModel.getDecryptedCredentials(accountId);
  }

  if (typeof credentialModel.getCredentialsByAccountId === "function") {
    return credentialModel.getCredentialsByAccountId(accountId);
  }

  if (typeof credentialModel.getCredentialByAccountId === "function") {
    return credentialModel.getCredentialByAccountId(accountId);
  }

  if (typeof credentialModel.findByAccountId === "function") {
    return credentialModel.findByAccountId(accountId);
  }

  if (typeof credentialModel.getByAccountId === "function") {
    return credentialModel.getByAccountId(accountId);
  }

  throw createServiceError(
    "credential_model.js missing credential getter function. Add getDecryptedCredentials(accountId).",
    500,
    "CREDENTIAL_GETTER_MISSING"
  );
}

async function updateDarazTokensSafe(accountId, tokenData) {
  if (typeof credentialModel.updateDarazTokens === "function") {
    return credentialModel.updateDarazTokens(accountId, tokenData);
  }

  if (typeof credentialModel.updateTokens === "function") {
    return credentialModel.updateTokens(accountId, tokenData);
  }

  if (typeof credentialModel.updateCredentialTokens === "function") {
    return credentialModel.updateCredentialTokens(accountId, tokenData);
  }

  throw createServiceError(
    "credential_model.js missing token update function. Need updateDarazTokens(accountId, tokenData).",
    500,
    "TOKEN_UPDATE_FUNCTION_MISSING"
  );
}

async function updateAccountStatusSafe(accountId, status, connectionStatus, errorMessage) {
  if (typeof accountModel.updateAccountStatus === "function") {
    return accountModel.updateAccountStatus(
      accountId,
      status,
      connectionStatus,
      errorMessage
    );
  }

  return null;
}

async function upsertAccountHealthSafe(accountId, platformCode, healthData) {
  if (typeof accountModel.upsertAccountHealth === "function") {
    return accountModel.upsertAccountHealth(accountId, platformCode, healthData);
  }

  return null;
}

async function createTokenLogSafe(payload) {
  try {
    if (typeof tokenLogModel.createTokenLog === "function") {
      return await tokenLogModel.createTokenLog(payload);
    }
  } catch (error) {
    console.error("[DARAZ_TOKEN_LOG_FAIL]:", {
      message: error?.message,
      code: error?.code,
      sqlMessage: error?.sqlMessage,
    });
  }

  return null;
}

function getAppKey(credentials) {
  return (
    credentials?.app_key ||
    credentials?.appKey ||
    credentials?.client_id ||
    credentials?.clientId ||
    process.env.DARAZ_APP_KEY ||
    process.env.DARAZ_CLIENT_ID
  );
}

function getAppSecret(credentials) {
  return (
    credentials?.app_secret ||
    credentials?.appSecret ||
    credentials?.client_secret ||
    credentials?.clientSecret ||
    process.env.DARAZ_APP_SECRET ||
    process.env.DARAZ_CLIENT_SECRET
  );
}

async function buildDarazReauthUrl(accountId) {
  try {
    const account = await getAccountByIdSafe(accountId);

    if (!account) {
      throw createServiceError("Marketplace account not found.", 404, "ACCOUNT_NOT_FOUND");
    }

    if (String(account.platform_code || "").toUpperCase() !== "DARAZ") {
      throw createServiceError(
        "Only Daraz accounts can be reauthorized.",
        400,
        "INVALID_PLATFORM"
      );
    }

    const credentials = await getCredentialByAccountIdSafe(accountId);
    const appKey = getAppKey(credentials);

    if (!appKey) {
      throw createServiceError(
        "Daraz app key missing. Save app_key in marketplace_credentials or set DARAZ_APP_KEY in .env.",
        400,
        "DARAZ_APP_KEY_MISSING"
      );
    }

    const redirectUri = getRedirectUri();

    if (!redirectUri) {
      throw createServiceError(
        "Daraz redirect URI missing. Add DARAZ_REAUTH_CALLBACK_URL or DARAZ_REDIRECT_URI in .env.",
        400,
        "DARAZ_REDIRECT_URI_MISSING"
      );
    }

    const state = encodeState({
      account_id: account.id,
      account_uid: account.account_uid || null,
      account_code: account.account_code || null,
      ts: Date.now(),
    });

    const url = new URL(getDarazOAuthBaseUrl(account));

    url.searchParams.set("response_type", "code");
    url.searchParams.set("force_auth", "true");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("client_id", appKey);
    url.searchParams.set("state", state);

    return {
      success: true,
      message: "Daraz reauthorization URL created successfully.",
      account: {
        id: account.id,
        account_uid: account.account_uid || null,
        account_code: account.account_code || null,
        account_name: account.account_name || null,
        platform_code: account.platform_code,
      },
      redirect_uri: redirectUri,
      authorization_url: url.toString(),
    };
  } catch (error) {
    throw createServiceError(
      error?.message || "Failed to build Daraz reauthorization URL.",
      error?.statusCode || 500,
      error?.code || "DARAZ_REAUTH_URL_FAILED"
    );
  }
}

async function handleDarazOAuthCallback({ code, state }) {
  let account = null;

  try {
    if (!code) {
      throw createServiceError(
        "Daraz authorization code missing.",
        400,
        "DARAZ_AUTH_CODE_MISSING"
      );
    }

    if (!state) {
      throw createServiceError(
        "Daraz OAuth state missing.",
        400,
        "DARAZ_OAUTH_STATE_MISSING"
      );
    }

    let stateData;

    try {
      stateData = decodeState(state);
    } catch (error) {
      throw createServiceError("Invalid OAuth state.", 400, "INVALID_OAUTH_STATE");
    }

    const accountId = stateData.account_id;

    if (!accountId) {
      throw createServiceError(
        "OAuth state missing account_id.",
        400,
        "OAUTH_ACCOUNT_ID_MISSING"
      );
    }

    account = await getAccountByIdSafe(accountId);

    if (!account) {
      throw createServiceError(
        "Marketplace account not found for callback.",
        404,
        "ACCOUNT_NOT_FOUND"
      );
    }

    if (String(account.platform_code || "").toUpperCase() !== "DARAZ") {
      throw createServiceError(
        "OAuth callback account is not a Daraz account.",
        400,
        "INVALID_PLATFORM"
      );
    }

    const credentials = await getCredentialByAccountIdSafe(accountId);

    const appKey = getAppKey(credentials);
    const appSecret = getAppSecret(credentials);

    if (!appKey || !appSecret) {
      throw createServiceError(
        "Daraz app key or app secret missing. Save app_key/app_secret in credentials or set DARAZ_APP_KEY and DARAZ_APP_SECRET in .env.",
        400,
        "DARAZ_APP_CREDENTIALS_MISSING"
      );
    }

    const finalCredentials = {
      ...credentials,
      app_key: appKey,
      app_secret: appSecret,
    };

    if (typeof darazApiService.createDarazTokenByCode !== "function") {
      throw createServiceError(
        "daraz_api_service.js missing createDarazTokenByCode function.",
        500,
        "TOKEN_API_FUNCTION_MISSING"
      );
    }

    const response = await darazApiService.createDarazTokenByCode(
      account,
      finalCredentials,
      code
    );

    const data = response?.data || response;

    const accessToken = data?.access_token;
    const refreshToken = data?.refresh_token;

    if (!accessToken || !refreshToken) {
      throw createServiceError(
        "Daraz token response missing access_token or refresh_token.",
        502,
        "DARAZ_TOKEN_RESPONSE_INVALID"
      );
    }

    const accessExpiresIn =
      data.expires_in ||
      data.access_token_expires_in ||
      data.expire_in ||
      604800;

    const refreshExpiresIn =
      data.refresh_expires_in ||
      data.refresh_token_expires_in ||
      null;

    const accessTokenExpiresAt = addSeconds(accessExpiresIn);

    const refreshTokenExpiresAt = refreshExpiresIn
      ? addSeconds(refreshExpiresIn)
      : credentials?.refresh_token_expires_at || null;

    await updateDarazTokensSafe(account.id, {
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_at: accessTokenExpiresAt,
      refresh_token_expires_at: refreshTokenExpiresAt,
      token_status: "valid",
    });

    await updateAccountStatusSafe(account.id, "active", "connected", null);

    await upsertAccountHealthSafe(account.id, "DARAZ", {
      connection_status: "connected",
      token_status: "valid",
      last_error: null,
    });

    await createTokenLogSafe({
      account_id: account.id,
      platform_code: "DARAZ",
      action_type: "token_created",
      new_access_token_expires_at: accessTokenExpiresAt,
      refresh_token_expires_at: refreshTokenExpiresAt,
      refresh_status: "success",
      message: "Daraz reauthorization completed successfully.",
    });

    return {
      success: true,
      message: "Daraz account reauthorized successfully.",
      account: {
        id: account.id,
        account_uid: account.account_uid || null,
        account_code: account.account_code || null,
        account_name: account.account_name || null,
        platform_code: account.platform_code,
      },
      token: {
        access_token_expires_at: accessTokenExpiresAt,
        refresh_token_expires_at: refreshTokenExpiresAt,
        token_status: "valid",
      },
    };
  } catch (error) {
    if (account?.id) {
      await updateAccountStatusSafe(
        account.id,
        "reauthorization_required",
        "error",
        error?.message || "Daraz reauthorization failed."
      );

      await upsertAccountHealthSafe(account.id, "DARAZ", {
        connection_status: "error",
        token_status: "invalid",
        last_error: error?.message || "Daraz reauthorization failed.",
      });

      await createTokenLogSafe({
        account_id: account.id,
        platform_code: "DARAZ",
        action_type: "token_created",
        refresh_status: "failed",
        message: error?.message || "Daraz reauthorization failed.",
      });
    }

    const finalError = createServiceError(
      error?.message || "Daraz reauthorization failed.",
      error?.statusCode || 500,
      error?.code || "DARAZ_REAUTH_FAILED"
    );

    finalError.details = {
      original_message: error?.message || null,
      daraz: error?.daraz || null,
      request_id: error?.request_id || null,
      trace_id: error?.trace_id || null,
    };

    throw finalError;
  }
}

module.exports = {
  buildDarazReauthUrl,
  handleDarazOAuthCallback,
};
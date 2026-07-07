const accountModel = require("../../models/marketplace/account_model");
const credentialModel = require("../../models/marketplace/credential_model");
const tokenLogModel = require("../../models/marketplace/token_log_model");
const darazApiService = require("./daraz_api_service");

function createTokenError(message, statusCode = 400, code = "TOKEN_ERROR") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function addSeconds(seconds) {
  return new Date(Date.now() + Number(seconds || 0) * 1000);
}

function isExpiringSoon(expiryDate, beforeMinutes = 30) {
  if (!expiryDate) return true;

  const expiryTime = new Date(expiryDate).getTime();

  if (!Number.isFinite(expiryTime)) return true;

  const checkTime = Date.now() + beforeMinutes * 60 * 1000;

  return expiryTime <= checkTime;
}

function getErrorMessage(error, fallback = "Token service error") {
  return (
    error?.daraz?.message ||
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    error?.message ||
    fallback
  );
}

function getErrorCode(error, fallback = "TOKEN_ERROR") {
  return (
    error?.daraz?.code ||
    error?.response?.data?.code ||
    error?.response?.data?.error_code ||
    error?.code ||
    fallback
  );
}

function buildErrorDetails(error) {
  return JSON.stringify({
    message: getErrorMessage(error),
    code: getErrorCode(error),
    type: error?.type || error?.daraz?.type || null,
    request_id: error?.request_id || error?.daraz?.request_id || null,
    trace_id: error?.trace_id || error?.daraz?.trace_id || null,
    daraz: error?.daraz || null,
    response: error?.response?.data || null,
  });
}

async function safeTokenLog(payload) {
  try {
    if (typeof tokenLogModel.createTokenLog === "function") {
      await tokenLogModel.createTokenLog(payload);
    }
  } catch (error) {
    console.error("[TOKEN_LOG_FAIL]:", {
      message: error?.message,
      code: error?.code,
      sqlMessage: error?.sqlMessage,
    });
  }
}

async function safeUpdateAccountHealth(account, data) {
  try {
    if (typeof accountModel.upsertAccountHealth === "function") {
      await accountModel.upsertAccountHealth(
        account.id,
        account.platform_code || "DARAZ",
        data
      );
    }
  } catch (error) {
    console.error("[TOKEN_HEALTH_UPDATE_FAIL]:", {
      account_id: account?.id,
      account_code: account?.account_code,
      message: error?.message,
      sqlMessage: error?.sqlMessage,
    });
  }
}

async function safeUpdateAccountStatus(account, status, connectionStatus, message = null) {
  try {
    if (typeof accountModel.updateAccountStatus === "function") {
      await accountModel.updateAccountStatus(
        account.id,
        status,
        connectionStatus,
        message
      );
    }
  } catch (error) {
    console.error("[TOKEN_ACCOUNT_STATUS_UPDATE_FAIL]:", {
      account_id: account?.id,
      account_code: account?.account_code,
      message: error?.message,
      sqlMessage: error?.sqlMessage,
    });
  }
}

async function safeUpdateTokenStatus(accountId, tokenStatus) {
  try {
    if (typeof credentialModel.updateTokenStatus === "function") {
      await credentialModel.updateTokenStatus(accountId, tokenStatus);
    }
  } catch (error) {
    console.error("[TOKEN_STATUS_UPDATE_FAIL]:", {
      account_id: accountId,
      token_status: tokenStatus,
      message: error?.message,
      sqlMessage: error?.sqlMessage,
    });
  }
}

async function markReauthorizationRequired(account, message) {
  await safeUpdateTokenStatus(account.id, "reauthorization_required");

  await safeUpdateAccountStatus(
    account,
    "reauthorization_required",
    "expired",
    message
  );

  await safeUpdateAccountHealth(account, {
    connection_status: "expired",
    token_status: "reauthorization_required",
    last_error: message,
  });

  await safeTokenLog({
    account_id: account.id,
    platform_code: account.platform_code || "DARAZ",
    action_type: "reauthorization_required",
    refresh_status: "failed",
    message,
  });
}

async function refreshDarazAccessToken(account, credentials) {
  const oldExpiry = credentials.access_token_expires_at;

  try {
    if (typeof darazApiService.refreshDarazToken !== "function") {
      throw createTokenError(
        "daraz_api_service.js missing refreshDarazToken function.",
        500,
        "REFRESH_FUNCTION_MISSING"
      );
    }

    const response = await darazApiService.refreshDarazToken(account, credentials);

    const data = response?.data || response;

    const accessToken = data?.access_token;
    const refreshToken = data?.refresh_token || credentials.refresh_token;

    if (!accessToken) {
      throw createTokenError(
        "Daraz refresh response does not contain access_token.",
        502,
        "DARAZ_REFRESH_RESPONSE_INVALID"
      );
    }

    const accessExpiresIn =
      data?.expires_in ||
      data?.access_token_expires_in ||
      data?.expire_in ||
      604800;

    const refreshExpiresIn =
      data?.refresh_expires_in ||
      data?.refresh_token_expires_in ||
      null;

    const newAccessExpiry = addSeconds(accessExpiresIn);

    const newRefreshExpiry = refreshExpiresIn
      ? addSeconds(refreshExpiresIn)
      : credentials.refresh_token_expires_at || null;

    await credentialModel.updateDarazTokens(account.id, {
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_at: newAccessExpiry,
      refresh_token_expires_at: newRefreshExpiry,
      token_status: "valid",
    });

    await safeUpdateAccountStatus(account, "active", "connected", null);

    await safeUpdateAccountHealth(account, {
      connection_status: "connected",
      token_status: "valid",
      last_error: null,
    });

    await safeTokenLog({
      account_id: account.id,
      platform_code: account.platform_code || "DARAZ",
      action_type: "token_refreshed",
      old_access_token_expires_at: oldExpiry,
      new_access_token_expires_at: newAccessExpiry,
      refresh_token_expires_at: newRefreshExpiry,
      refresh_status: "success",
      message: "Daraz access token refreshed successfully.",
    });

    return {
      ...credentials,
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_at: newAccessExpiry,
      refresh_token_expires_at: newRefreshExpiry,
      token_status: "valid",
    };
  } catch (error) {
    const message = getErrorMessage(error, "Daraz token refresh failed.");
    const errorCode = getErrorCode(error, "TOKEN_REFRESH_FAILED");

    await safeUpdateTokenStatus(account.id, "refresh_failed");

    await safeUpdateAccountStatus(account, "token_expired", "expired", message);

    await safeUpdateAccountHealth(account, {
      connection_status: "expired",
      token_status: "refresh_failed",
      last_error: message,
    });

    await safeTokenLog({
      account_id: account.id,
      platform_code: account.platform_code || "DARAZ",
      action_type: "token_failed",
      old_access_token_expires_at: oldExpiry,
      refresh_token_expires_at: credentials.refresh_token_expires_at,
      refresh_status: "failed",
      message,
      error_code: errorCode,
      error_details: buildErrorDetails(error),
    });

    const finalError = createTokenError(
      message,
      error?.statusCode || 500,
      errorCode
    );

    finalError.details = {
      account_id: account.id,
      account_code: account.account_code || null,
      daraz: error?.daraz || null,
      request_id: error?.request_id || null,
      trace_id: error?.trace_id || null,
    };

    throw finalError;
  }
}

async function getValidCredentialsForAccount(accountId) {
  if (!accountId) {
    throw createTokenError("Account ID is required.", 400, "ACCOUNT_ID_REQUIRED");
  }

  const account = await accountModel.getAccountById(accountId);

  if (!account) {
    throw createTokenError("Account not found.", 404, "ACCOUNT_NOT_FOUND");
  }

  const credentials = await credentialModel.getDecryptedCredentials(accountId);

  if (!credentials) {
    throw createTokenError(
      "Account credentials not found.",
      404,
      "CREDENTIALS_NOT_FOUND"
    );
  }

  const platformCode = String(account.platform_code || "").toUpperCase();

  if (platformCode === "WOO") {
    return {
      account,
      credentials,
      refreshed: false,
      message: "WooCommerce credentials loaded successfully.",
    };
  }

  if (platformCode !== "DARAZ") {
    return {
      account,
      credentials,
      refreshed: false,
      message: "Marketplace credentials loaded successfully.",
    };
  }

  if (!credentials.refresh_token) {
    const message = "Refresh token missing. Reauthorization required.";

    await markReauthorizationRequired(account, message);

    throw createTokenError(message, 401, "REFRESH_TOKEN_MISSING");
  }

  if (
    credentials.refresh_token_expires_at &&
    new Date(credentials.refresh_token_expires_at).getTime() <= Date.now()
  ) {
    const message = "Refresh token expired. Reauthorization required.";

    await markReauthorizationRequired(account, message);

    throw createTokenError(message, 401, "REFRESH_TOKEN_EXPIRED");
  }

  if (isExpiringSoon(credentials.access_token_expires_at, 30)) {
    const refreshedCredentials = await refreshDarazAccessToken(account, credentials);

    return {
      account,
      credentials: refreshedCredentials,
      refreshed: true,
      message: "Daraz access token refreshed successfully.",
    };
  }

  await safeUpdateAccountStatus(account, "active", "connected", null);

  await safeUpdateAccountHealth(account, {
    connection_status: "connected",
    token_status: "valid",
    last_error: null,
  });

  return {
    account,
    credentials,
    refreshed: false,
    message: "Daraz access token is valid.",
  };
}

// Some Daraz endpoints (category/tree/get, category/attributes/get,
// category/brands/query) explicitly document access_token as NOT required —
// they only need the app's static app_key/app_secret, which never expire.
// Routing them through getValidCredentialsForAccount forces an access-token
// refresh they don't need, which needlessly fails the whole call whenever
// the account's refresh token itself is stale/invalid.
async function getAppCredentialsForAccount(accountId) {
  if (!accountId) {
    throw createTokenError("Account ID is required.", 400, "ACCOUNT_ID_REQUIRED");
  }

  const account = await accountModel.getAccountById(accountId);

  if (!account) {
    throw createTokenError("Account not found.", 404, "ACCOUNT_NOT_FOUND");
  }

  const credentials = await credentialModel.getDecryptedCredentials(accountId);

  if (!credentials) {
    throw createTokenError(
      "Account credentials not found.",
      404,
      "CREDENTIALS_NOT_FOUND"
    );
  }

  return { account, credentials };
}

async function checkAllDarazTokens() {
  const accounts = await accountModel.getActiveDarazAccounts();

  const summary = {
    total: Array.isArray(accounts) ? accounts.length : 0,
    valid: 0,
    refreshed: 0,
    failed: 0,
    failed_accounts: [],
    message: "",
  };

  if (!Array.isArray(accounts) || accounts.length === 0) {
    summary.message = "No active Daraz accounts found.";
    return summary;
  }

  for (const account of accounts) {
    try {
      const result = await getValidCredentialsForAccount(account.id);

      if (result?.refreshed) {
        summary.refreshed += 1;
      } else {
        summary.valid += 1;
      }
    } catch (error) {
      summary.failed += 1;

      summary.failed_accounts.push({
        account_id: account.id,
        account_code: account.account_code || null,
        message: error?.message || "Token check failed.",
        code: error?.code || null,
      });
    }
  }

  summary.message = `Daraz token check completed. Total: ${summary.total}, Valid: ${summary.valid}, Refreshed: ${summary.refreshed}, Failed: ${summary.failed}.`;

  return summary;
}

module.exports = {
  getValidCredentialsForAccount,
  getAppCredentialsForAccount,
  refreshDarazAccessToken,
  checkAllDarazTokens,
  isExpiringSoon,
};
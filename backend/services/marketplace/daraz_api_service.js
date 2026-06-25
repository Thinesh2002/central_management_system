const axios = require("axios");
const crypto = require("crypto");

const syncLogModel = require("../../models/marketplace/sync_log_model");

function getDarazBaseUrl(account) {
  const baseUrl =
    account?.api_base_url ||
    process.env.DARAZ_API_BASE_URL ||
    "https://api.daraz.lk/rest";

  return String(baseUrl).replace(/\/$/, "");
}

function toDarazTimestamp() {
  return Date.now().toString();
}

function makeRequestUid(prefix = "daraz") {
  return `${prefix}_${Date.now()}_${crypto.randomUUID()}`;
}

function plainValue(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeAppKey(credentials) {
  return plainValue(
    credentials?.app_key ||
      credentials?.appKey ||
      credentials?.client_id ||
      credentials?.clientId ||
      process.env.DARAZ_APP_KEY ||
      process.env.DARAZ_CLIENT_ID ||
      ""
  );
}

function normalizeSecret(credentials) {
  return plainValue(
    credentials?.app_secret ||
      credentials?.appSecret ||
      credentials?.client_secret ||
      credentials?.clientSecret ||
      process.env.DARAZ_APP_SECRET ||
      process.env.DARAZ_CLIENT_SECRET ||
      ""
  );
}

function normalizeAccessToken(credentials) {
  return plainValue(
    credentials?.access_token ||
      credentials?.accessToken ||
      credentials?.token ||
      ""
  );
}

function normalizeRefreshToken(credentials) {
  return plainValue(
    credentials?.refresh_token ||
      credentials?.refreshToken ||
      ""
  );
}

function normalizeParamValue(value) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function cleanParams(params = {}) {
  const cleaned = {};

  Object.entries(params || {}).forEach(([key, value]) => {
    const normalized = normalizeParamValue(value);
    if (normalized === null || normalized === "") return;
    cleaned[key] = normalized;
  });

  return cleaned;
}

/**
 * Daraz Signature:
 * apiPath + sortedKey1 + value1 + sortedKey2 + value2...
 * HMAC-SHA256 using app_secret
 * Uppercase HEX
 */
function signDarazRequest(apiPath, params, appSecret) {
  const path = String(apiPath || "").startsWith("/")
    ? String(apiPath || "")
    : `/${String(apiPath || "")}`;

  const sortedKeys = Object.keys(params || {})
    .filter((key) => key !== "sign")
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort();

  let stringToSign = path;

  for (const key of sortedKeys) {
    stringToSign += `${key}${params[key]}`;
  }

  return crypto
    .createHmac("sha256", plainValue(appSecret))
    .update(stringToSign, "utf8")
    .digest("hex")
    .toUpperCase();
}

function normalizeLogPayload(payload = {}) {
  const endpoint =
    payload.endpoint ||
    payload.api_path ||
    payload.apiPath ||
    payload.path ||
    null;

  return {
    ...payload,
    endpoint,
    api_path: payload.api_path || endpoint,
    http_method: payload.http_method || payload.method || "GET",
    status: payload.status || "success",
    response_code: payload.response_code || payload.response_status_code || null,
    duration_ms: payload.duration_ms || 0,
  };
}

async function safeCreateApiLog(payload) {
  try {
    if (syncLogModel?.createApiRequestLog) {
      await syncLogModel.createApiRequestLog(normalizeLogPayload(payload));
    }
  } catch (error) {
    console.error("[DARAZ_API_LOG_FAIL]:", {
      message: error?.message,
      code: error?.code,
      sqlMessage: error?.sqlMessage,
    });
  }
}

function getDarazErrorSource(responseData) {
  if (!responseData) return null;
  if (responseData.ErrorResponse) return responseData.ErrorResponse;
  if (responseData.error_response) return responseData.error_response;
  return responseData;
}

function normalizeDarazErrorPayload(error = null, responseData = null) {
  const source = getDarazErrorSource(responseData || error?.response?.data);

  if (source) {
    const code =
      source.code ||
      source.error_code ||
      source.errorCode ||
      source.error ||
      null;

    const message =
      source.message ||
      source.msg ||
      source.error_message ||
      source.errorMessage ||
      "Daraz API error";

    return {
      success: false,
      type: source.type || null,
      code,
      message,
      request_id: source.request_id || source.requestId || null,
      trace_id: source._trace_id_ || source.trace_id || null,
      raw: responseData || error?.response?.data || source,
    };
  }

  if (error?.code === "ECONNABORTED") {
    return {
      success: false,
      type: "NETWORK",
      code: "TIMEOUT",
      message: "Daraz API request timeout. Please try again.",
      request_id: null,
      trace_id: null,
      raw: null,
    };
  }

  if (error?.code === "ENOTFOUND" || error?.code === "ECONNREFUSED") {
    return {
      success: false,
      type: "NETWORK",
      code: error.code,
      message: "Cannot connect to Daraz API. Please check internet or API base URL.",
      request_id: null,
      trace_id: null,
      raw: null,
    };
  }

  return {
    success: false,
    type: "UNKNOWN",
    code: error?.code || null,
    message: error?.message || "Daraz API request failed",
    request_id: null,
    trace_id: null,
    raw: error?.response?.data || null,
  };
}

function isDarazApiError(responseData) {
  if (!responseData) return true;
  if (responseData.ErrorResponse) return true;
  if (responseData.error_response) return true;
  if (responseData.type === "ISV" || responseData.type === "ISP") return true;

  if (
    responseData.code &&
    String(responseData.code) !== "0" &&
    String(responseData.code).toLowerCase() !== "success"
  ) {
    return true;
  }

  if (
    responseData.error_code &&
    String(responseData.error_code) !== "0" &&
    String(responseData.error_code).toLowerCase() !== "success"
  ) {
    return true;
  }

  return false;
}

function createDarazApiError(darazError, statusCode = null) {
  const error = new Error(darazError.message || "Daraz API error");

  error.name = "DarazApiError";
  error.statusCode = statusCode || 400;
  error.daraz = darazError;
  error.code = darazError.code;
  error.type = darazError.type;
  error.request_id = darazError.request_id;
  error.trace_id = darazError.trace_id;
  error.raw = darazError.raw;

  return error;
}

function assertCredentialsReady({ appKey, appSecret, accessToken }) {
  if (!appKey) {
    const error = new Error("Daraz app key missing");
    error.statusCode = 400;
    error.code = "DARAZ_APP_KEY_MISSING";
    throw error;
  }

  if (!appSecret) {
    const error = new Error("Daraz app secret missing");
    error.statusCode = 400;
    error.code = "DARAZ_APP_SECRET_MISSING";
    throw error;
  }

  if (!accessToken) {
    const error = new Error("Daraz access token missing");
    error.statusCode = 401;
    error.code = "DARAZ_ACCESS_TOKEN_MISSING";
    throw error;
  }
}

function assertAppCredentialsReady({ appKey, appSecret }) {
  if (!appKey) {
    const error = new Error("Daraz app key missing");
    error.statusCode = 400;
    error.code = "DARAZ_APP_KEY_MISSING";
    throw error;
  }

  if (!appSecret) {
    const error = new Error("Daraz app secret missing");
    error.statusCode = 400;
    error.code = "DARAZ_APP_SECRET_MISSING";
    throw error;
  }
}

function buildSuccessMessage(requestType, apiPath) {
  const type = String(requestType || "").toLowerCase();

  if (type.includes("order")) return "Daraz orders fetched successfully.";
  if (type.includes("product")) return "Daraz products fetched successfully.";
  if (type.includes("categor")) return "Daraz categories fetched successfully.";
  if (type.includes("brand")) return "Daraz brands fetched successfully.";
  if (type.includes("finance")) return "Daraz finance data fetched successfully.";
  if (type.includes("auth")) return "Daraz authentication request completed successfully.";
  if (type.includes("token_refresh")) return "Daraz token refreshed successfully.";
  if (type.includes("token_create")) return "Daraz token created successfully.";

  return `Daraz API request completed successfully: ${apiPath}`;
}

function safeRequestLog({
  requestUid,
  account,
  apiPath,
  requestType,
  method,
  appKey = "",
  appSecret = "",
  accessToken = "",
}) {
  return {
    request_uid: requestUid,
    account_code: account?.account_code || null,
    api_path: apiPath,
    endpoint: apiPath,
    request_type: requestType,
    method,
    credentials_ready: Boolean(appKey && appSecret && accessToken),
    has_app_key: Boolean(appKey),
    has_app_secret: Boolean(appSecret),
    has_access_token: Boolean(accessToken),
  };
}

async function callDarazApi({
  account,
  credentials,
  apiPath,
  method = "GET",
  requestType = "other",
  query = {},
  body = null,
}) {
  if (!account) {
    const error = new Error("Daraz account missing");
    error.statusCode = 400;
    error.code = "DARAZ_ACCOUNT_MISSING";
    throw error;
  }

  if (!credentials) {
    const error = new Error("Daraz credentials missing");
    error.statusCode = 400;
    error.code = "DARAZ_CREDENTIALS_MISSING";
    throw error;
  }

  if (!apiPath) {
    const error = new Error("Daraz API path missing");
    error.statusCode = 400;
    error.code = "DARAZ_API_PATH_MISSING";
    throw error;
  }

  const requestUid = makeRequestUid(requestType || "daraz_api");
  const startedAt = Date.now();

  const baseUrl = getDarazBaseUrl(account);
  const appKey = normalizeAppKey(credentials);
  const appSecret = normalizeSecret(credentials);
  const accessToken = normalizeAccessToken(credentials);

  assertCredentialsReady({
    appKey,
    appSecret,
    accessToken,
  });

const commonParams = cleanParams({
  app_key: appKey,
  timestamp: toDarazTimestamp(),
  access_token: accessToken,
  sign_method: "sha256",
  ...query,
});

  const sign = signDarazRequest(apiPath, commonParams, appSecret);

  const finalParams = {
    ...commonParams,
    sign,
  };

  const url = `${baseUrl}${apiPath}`;

  console.log(
    "[DARAZ_API_REQUEST]",
    safeRequestLog({
      requestUid,
      account,
      apiPath,
      requestType,
      method,
      appKey,
      appSecret,
      accessToken,
    })
  );

  try {
    const response = await axios({
      url,
      method,
      params: finalParams,
      data: body,
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseData = response.data;
    const apiHasError = isDarazApiError(responseData);

    if (apiHasError) {
      const darazError = normalizeDarazErrorPayload(null, responseData);

      await safeCreateApiLog({
        request_uid: requestUid,
        account_id: account.id,
        platform_code: account.platform_code || "DARAZ",
        request_type: requestType,
        endpoint: apiPath,
        api_path: apiPath,
        http_method: method,
        status: "failed",
        response_code: response.status,
        error_message: darazError.message,
        response_summary: JSON.stringify(darazError),
        duration_ms: Date.now() - startedAt,
      });

      console.error("[DARAZ_API_RESPONSE_ERROR]", {
        request_uid: requestUid,
        account_code: account.account_code,
        api_path: apiPath,
        endpoint: apiPath,
        code: darazError.code,
        message: darazError.message,
        request_id: darazError.request_id,
        trace_id: darazError.trace_id,
      });

      throw createDarazApiError(darazError, response.status);
    }

    const successMessage = buildSuccessMessage(requestType, apiPath);

    await safeCreateApiLog({
      request_uid: requestUid,
      account_id: account.id,
      platform_code: account.platform_code || "DARAZ",
      request_type: requestType,
      endpoint: apiPath,
      api_path: apiPath,
      http_method: method,
      status: "success",
      response_code: response.status,
      success_message: successMessage,
      error_message: null,
      duration_ms: Date.now() - startedAt,
    });

    console.log("[DARAZ_API_RESPONSE_SUCCESS]", {
      request_uid: requestUid,
      account_code: account.account_code,
      api_path: apiPath,
      endpoint: apiPath,
      message: successMessage,
      response_code: response.status,
      duration_ms: Date.now() - startedAt,
    });

    return {
      success: true,
      message: successMessage,
      request_uid: requestUid,
      response_code: response.status,
      data: responseData,
    };
  } catch (error) {
    if (error?.name === "DarazApiError") {
      throw error;
    }

    const darazError = normalizeDarazErrorPayload(error);

    await safeCreateApiLog({
      request_uid: requestUid,
      account_id: account.id,
      platform_code: account.platform_code || "DARAZ",
      request_type: requestType,
      endpoint: apiPath,
      api_path: apiPath,
      http_method: method,
      status: "failed",
      response_code: error?.response?.status || null,
      error_message: darazError.message,
      response_summary: JSON.stringify(darazError),
      duration_ms: Date.now() - startedAt,
    });

    console.error("[DARAZ_API_REQUEST_FAILED]", {
      request_uid: requestUid,
      account_code: account.account_code,
      api_path: apiPath,
      endpoint: apiPath,
      code: darazError.code,
      message: darazError.message,
      request_id: darazError.request_id,
      trace_id: darazError.trace_id,
    });

    throw createDarazApiError(darazError, error?.response?.status || 500);
  }
}

async function callDarazApiWithoutAccessToken({
  account = null,
  credentials = {},
  apiPath,
  method = "GET",
  requestType = "auth",
  query = {},
  body = null,
}) {
  if (!apiPath) {
    const error = new Error("Daraz API path missing");
    error.statusCode = 400;
    error.code = "DARAZ_API_PATH_MISSING";
    throw error;
  }

  const requestUid = makeRequestUid(requestType || "daraz_auth");
  const startedAt = Date.now();

  const baseUrl = getDarazBaseUrl(account);
  const appKey = normalizeAppKey(credentials);
  const appSecret = normalizeSecret(credentials);

  assertAppCredentialsReady({
    appKey,
    appSecret,
  });

  const commonParams = cleanParams({
    app_key: appKey,
    timestamp: toDarazTimestamp(),
    sign_method: "sha256",
    format: "json",
    ...query,
  });

  const sign = signDarazRequest(apiPath, commonParams, appSecret);

  const finalParams = {
    ...commonParams,
    sign,
  };

  const url = `${baseUrl}${apiPath}`;

  console.log(
    "[DARAZ_AUTH_API_REQUEST]",
    safeRequestLog({
      requestUid,
      account,
      apiPath,
      requestType,
      method,
      appKey,
      appSecret,
      accessToken: "not_required",
    })
  );

  try {
    const response = await axios({
      url,
      method,
      params: finalParams,
      data: body,
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseData = response.data;

    if (isDarazApiError(responseData)) {
      const darazError = normalizeDarazErrorPayload(null, responseData);

      await safeCreateApiLog({
        request_uid: requestUid,
        account_id: account?.id || null,
        platform_code: account?.platform_code || "DARAZ",
        request_type: requestType,
        endpoint: apiPath,
        api_path: apiPath,
        http_method: method,
        status: "failed",
        response_code: response.status,
        error_message: darazError.message,
        response_summary: JSON.stringify(darazError),
        duration_ms: Date.now() - startedAt,
      });

      console.error("[DARAZ_AUTH_API_RESPONSE_ERROR]", {
        request_uid: requestUid,
        account_code: account?.account_code || null,
        api_path: apiPath,
        endpoint: apiPath,
        code: darazError.code,
        message: darazError.message,
        request_id: darazError.request_id,
        trace_id: darazError.trace_id,
      });

      throw createDarazApiError(darazError, response.status);
    }

    const successMessage = buildSuccessMessage(requestType, apiPath);

    await safeCreateApiLog({
      request_uid: requestUid,
      account_id: account?.id || null,
      platform_code: account?.platform_code || "DARAZ",
      request_type: requestType,
      endpoint: apiPath,
      api_path: apiPath,
      http_method: method,
      status: "success",
      response_code: response.status,
      success_message: successMessage,
      error_message: null,
      duration_ms: Date.now() - startedAt,
    });

    console.log("[DARAZ_AUTH_API_RESPONSE_SUCCESS]", {
      request_uid: requestUid,
      account_code: account?.account_code || null,
      api_path: apiPath,
      endpoint: apiPath,
      message: successMessage,
      response_code: response.status,
      duration_ms: Date.now() - startedAt,
    });

    return {
      success: true,
      message: successMessage,
      request_uid: requestUid,
      response_code: response.status,
      data: responseData,
    };
  } catch (error) {
    if (error?.name === "DarazApiError") {
      throw error;
    }

    const darazError = normalizeDarazErrorPayload(error);

    await safeCreateApiLog({
      request_uid: requestUid,
      account_id: account?.id || null,
      platform_code: account?.platform_code || "DARAZ",
      request_type: requestType,
      endpoint: apiPath,
      api_path: apiPath,
      http_method: method,
      status: "failed",
      response_code: error?.response?.status || null,
      error_message: darazError.message,
      response_summary: JSON.stringify(darazError),
      duration_ms: Date.now() - startedAt,
    });

    console.error("[DARAZ_AUTH_API_REQUEST_FAILED]", {
      request_uid: requestUid,
      account_code: account?.account_code || null,
      api_path: apiPath,
      endpoint: apiPath,
      code: darazError.code,
      message: darazError.message,
      request_id: darazError.request_id,
      trace_id: darazError.trace_id,
    });

    throw createDarazApiError(darazError, error?.response?.status || 500);
  }
}

async function createDarazTokenByCode(account, credentials, code) {
  if (!code) {
    const error = new Error("Daraz authorization code missing");
    error.statusCode = 400;
    error.code = "DARAZ_AUTH_CODE_MISSING";
    throw error;
  }

  return callDarazApiWithoutAccessToken({
    account,
    credentials,
    apiPath: "/auth/token/create",
    method: "GET",
    requestType: "token_create",
    query: {
      code,
    },
  });
}

async function refreshDarazToken(account, credentials) {
  const refreshToken = normalizeRefreshToken(credentials);

  if (!refreshToken) {
    const error = new Error("Daraz refresh token missing");
    error.statusCode = 401;
    error.code = "DARAZ_REFRESH_TOKEN_MISSING";
    throw error;
  }

  return callDarazApiWithoutAccessToken({
    account,
    credentials,
    apiPath: "/auth/token/refresh",
    method: "GET",
    requestType: "token_refresh",
    query: {
      refresh_token: refreshToken,
    },
  });
}

module.exports = {
  callDarazApi,
  callDarazApiWithoutAccessToken,
  createDarazTokenByCode,
  refreshDarazToken,
  signDarazRequest,
  isDarazApiError,
  normalizeDarazErrorPayload,
};
const axios = require("axios");
const crypto = require("crypto");
const accountModel = require("../../models/daraz/daraz_account/daraz_account_model");
const db = require("../../config/product_management_db");

const DEFAULT_DARAZ_API_URL = process.env.DARAZ_BASE_URL || "https://api.daraz.lk/rest";
const DEFAULT_TIMEOUT_MS = Number(process.env.DARAZ_API_TIMEOUT_MS || 30000);
const TOKEN_REFRESH_BUFFER_MINUTES = Number(process.env.DARAZ_TOKEN_REFRESH_BUFFER_MINUTES || 30);

const safeJsonStringify = (data, fallback = null) => {
  try {
    return data === undefined ? fallback : JSON.stringify(data);
  } catch {
    return fallback;
  }
};

const normalizeBaseUrl = (url) => (url || DEFAULT_DARAZ_API_URL).replace(/\/$/, "");
const normalizeOauthBaseUrl = (url) => normalizeBaseUrl(url).replace(/\/rest$/, "");

const getAppKey = (account = {}) => account.app_key || process.env.DARAZ_APP_KEY;
const getAppSecret = (account = {}) => account.app_secret || process.env.DARAZ_APP_SECRET;

const buildUserFriendlyTokenError = (error, accountCode = "account") => {
  const responseData = error?.response?.data || error?.responseData || null;
  const darazCode = responseData?.code || responseData?.error || null;
  const darazMessage = responseData?.message || responseData?.msg || responseData?.error_description || error?.message || "Unknown refresh error";
  const rawText = `${darazCode || ""} ${darazMessage}`.toLowerCase();

  let reason = "Daraz did not accept the saved refresh token.";
  let nextAction = "Re-authorize this Daraz account from the Accounts page, then run sync again.";

  if (rawText.includes("expired") || rawText.includes("invalid") || rawText.includes("illegal") || rawText.includes("refresh")) {
    reason = "The saved refresh token is expired, invalid, or already replaced by a newer token.";
  } else if (rawText.includes("app") || rawText.includes("secret") || rawText.includes("sign")) {
    reason = "The App Key/App Secret/signature configuration is not matching Daraz Open Platform.";
    nextAction = "Check DARAZ_APP_KEY and DARAZ_APP_SECRET in .env, restart backend, then try refresh again.";
  } else if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
    reason = "Daraz token refresh request timed out.";
    nextAction = "Try again. If it repeats, check server network/firewall and Daraz API availability.";
  }

  const friendly = new Error(`${accountCode}: token refresh failed. ${reason} ${nextAction}`);
  friendly.responseData = responseData;
  friendly.originalMessage = error?.message;
  friendly.darazCode = darazCode;
  friendly.darazMessage = darazMessage;
  return friendly;
};

const generateDarazSign = (apiPath, params, appSecret) => {
  const sortedKeys = Object.keys(params)
    .filter((key) => key !== "sign" && params[key] !== undefined && params[key] !== null)
    .sort();

  let signString = apiPath;
  sortedKeys.forEach((key) => {
    signString += key + params[key];
  });

  return crypto.createHmac("sha256", appSecret).update(signString).digest("hex").toUpperCase();
};

const isTokenExpiringSoon = (account = {}) => {
  if (!account.access_token) return true;
  if (!account.access_token_expires_at) return false;

  const expiresAt = new Date(account.access_token_expires_at).getTime();
  if (Number.isNaN(expiresAt)) return false;

  const refreshBefore = Date.now() + TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000;
  return expiresAt <= refreshBefore;
};

const extractData = (responseData) => responseData?.data || responseData || {};

const normalizeTokenPayload = (responseData = {}) => {
  const data = extractData(responseData);
  const now = new Date();

  const accessExpiresAt = data.expires_in
    ? new Date(now.getTime() + Number(data.expires_in) * 1000)
    : null;

  const refreshExpiresAt = data.refresh_expires_in
    ? new Date(now.getTime() + Number(data.refresh_expires_in) * 1000)
    : null;

  return {
    access_token: data.access_token || null,
    refresh_token: data.refresh_token || null,
    expires_in: data.expires_in || null,
    refresh_expires_in: data.refresh_expires_in || null,
    access_token_expires_at: accessExpiresAt,
    refresh_token_expires_at: refreshExpiresAt,
    raw: responseData
  };
};

const logApiCall = async ({ account, apiPath, method, params, body, responseData, status, error, durationMs }) => {
  try {
    const redactedParams = { ...(params || {}) };
    delete redactedParams.sign;
    if (redactedParams.access_token) redactedParams.access_token = "[REDACTED]";

    await db.query(
      `
      INSERT INTO daraz_api_logs (
        account_id, account_code, api_path, http_method,
        request_params_json, request_body_json, response_code, response_json,
        status, error_message, duration_ms, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        account?.id || null,
        account?.account_code || null,
        apiPath,
        method,
        safeJsonStringify(redactedParams),
        safeJsonStringify(body),
        responseData?.code || null,
        safeJsonStringify(responseData),
        status,
        error?.message || null,
        durationMs || null
      ]
    );
  } catch (logError) {
    console.error("[DARAZ_API_LOG_FAIL]:", logError.message);
  }
};

const safeMarkTokenStatus = async (account, status) => {
  try {
    return await accountModel.markTokenStatus(account, status);
  } catch (error) {
    console.error("[DARAZ_TOKEN_STATUS_UPDATE_FAIL]:", error.message);
    return 0;
  }
};

const safeCreateTokenLog = async (payload) => {
  try {
    return await accountModel.createTokenLog(payload);
  } catch (error) {
    console.error("[DARAZ_TOKEN_LOG_FAIL]:", error.message);
    return null;
  }
};

const refreshAccessToken = async (account) => {
  if (!account?.refresh_token) {
    await safeMarkTokenStatus(account, "reauth_required");
    const missingTokenError = new Error(`Daraz refresh token missing for account ${account?.account_code || "unknown"}. Re-authorize account.`);
    missingTokenError.darazCode = "REFRESH_TOKEN_MISSING";
    missingTokenError.darazMessage = "No refresh token is saved for this seller account.";
    throw missingTokenError;
  }

  const apiPath = "/auth/token/refresh";
  const appKey = getAppKey(account);
  const appSecret = getAppSecret(account);

  if (!appKey || !appSecret) {
    throw new Error("DARAZ_APP_KEY / DARAZ_APP_SECRET missing. Add them to .env or account settings.");
  }

  const timestamp = Date.now().toString();
  const params = {
    app_key: appKey,
    refresh_token: account.refresh_token,
    sign_method: "sha256",
    timestamp
  };

  const sign = generateDarazSign(apiPath, params, appSecret);
  const startedAt = Date.now();

  try {
    const response = await axios.get(`${normalizeBaseUrl(account.api_base_url)}${apiPath}`, {
      params: { ...params, sign },
      timeout: DEFAULT_TIMEOUT_MS
    });

    if (response.data?.code && response.data.code !== "0") {
      const error = new Error(response.data?.message || response.data?.msg || `Daraz token refresh failed. Code: ${response.data.code}`);
      error.responseData = response.data;
      throw error;
    }

    const tokenPayload = normalizeTokenPayload(response.data);
    await accountModel.updateTokens(account, tokenPayload);
    await safeCreateTokenLog({ account, action: "refresh", status: "success", message: "Token refreshed", tokenPayload });

    await logApiCall({
      account,
      apiPath,
      method: "GET",
      params,
      responseData: response.data,
      status: "success",
      durationMs: Date.now() - startedAt
    });

    return { ...account, ...tokenPayload };
  } catch (error) {
    const friendlyError = buildUserFriendlyTokenError(error, account?.account_code || "account");
    const rawText = `${friendlyError.darazCode || ""} ${friendlyError.darazMessage || ""}`.toLowerCase();
    const finalTokenStatus = rawText.includes("expired") || rawText.includes("invalid") || rawText.includes("illegal")
      ? "reauth_required"
      : "refresh_failed";

    await safeMarkTokenStatus(account, finalTokenStatus);
    await safeCreateTokenLog({ account, action: "refresh", status: "failed", message: friendlyError.message, error: friendlyError });
    await logApiCall({
      account,
      apiPath,
      method: "GET",
      params,
      responseData: friendlyError.responseData,
      status: "failed",
      error: friendlyError,
      durationMs: Date.now() - startedAt
    });
    throw friendlyError;
  }
};

const ensureValidToken = async (account) => {
  if (!account) throw new Error("Daraz account is required");

  if (isTokenExpiringSoon(account)) {
    return refreshAccessToken(account);
  }

  return account;
};

const callDarazApi = async ({
  account,
  apiPath,
  method = "GET",
  params = {},
  body = null,
  requiresAuth = true,
  retry = 1,
  timeout = DEFAULT_TIMEOUT_MS
}) => {
  if (!apiPath || !apiPath.startsWith("/")) {
    throw new Error("apiPath must start with /");
  }

  let activeAccount = account || {};
  if (requiresAuth) {
    activeAccount = await ensureValidToken(activeAccount);
  }

  const appKey = getAppKey(activeAccount);
  const appSecret = getAppSecret(activeAccount);

  if (!appKey || !appSecret) {
    throw new Error("DARAZ_APP_KEY / DARAZ_APP_SECRET missing. Add them to .env or daraz_accounts.");
  }

  const commonParams = {
    app_key: appKey,
    sign_method: "sha256",
    timestamp: Date.now().toString(),
    ...params
  };

  if (requiresAuth) {
    if (!activeAccount.access_token) {
      throw new Error(`Daraz access token missing for ${activeAccount.account_code || "account"}`);
    }
    commonParams.access_token = activeAccount.access_token;
  }

  const sign = generateDarazSign(apiPath, commonParams, appSecret);
  const finalParams = { ...commonParams, sign };
  const url = `${normalizeBaseUrl(activeAccount.api_base_url)}${apiPath}`;
  const startedAt = Date.now();

  try {
    const config = {
      method: method.toUpperCase(),
      url,
      timeout,
      params: method.toUpperCase() === "GET" ? finalParams : undefined,
      data: method.toUpperCase() === "GET" ? undefined : body || finalParams,
      headers: method.toUpperCase() === "GET" ? undefined : { "Content-Type": "application/x-www-form-urlencoded" }
    };

    const response = await axios(config);
    const status = response.data?.code && response.data.code !== "0" ? "failed" : "success";

    await logApiCall({
      account: activeAccount,
      apiPath,
      method: method.toUpperCase(),
      params: finalParams,
      body,
      responseData: response.data,
      status,
      durationMs: Date.now() - startedAt
    });

    if (response.data?.code && response.data.code !== "0") {
      const message = response.data?.message || response.data?.msg || `Daraz API error: ${response.data.code}`;
      const error = new Error(message);
      error.responseData = response.data;
      throw error;
    }

    return response.data;
  } catch (error) {
    const shouldRetry = retry > 0 && (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT" ||
      error.response?.status >= 500
    );

    if (shouldRetry) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return callDarazApi({ account: activeAccount, apiPath, method, params, body, requiresAuth, retry: retry - 1, timeout });
    }

    await logApiCall({
      account: activeAccount,
      apiPath,
      method: method.toUpperCase(),
      params: finalParams,
      body,
      status: error.code === "ECONNABORTED" ? "timeout" : "failed",
      error,
      durationMs: Date.now() - startedAt
    });

    throw error;
  }
};

const getAuthorizationUrl = (account = {}, extra = {}) => {
  const appKey = getAppKey(account);
  if (!appKey) throw new Error("DARAZ_APP_KEY missing. Add it to .env or daraz_accounts.");

  const redirectUri = extra.redirect_uri || process.env.DARAZ_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("DARAZ_REDIRECT_URI missing. Add your exact Daraz Open Platform callback URL to .env.");
  }

  const authBaseUrl = normalizeOauthBaseUrl(account.api_base_url || DEFAULT_DARAZ_API_URL);
  const url = new URL(`${authBaseUrl}/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("force_auth", "true");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("client_id", appKey);
  url.searchParams.set("state", extra.state || account.account_code || "daraz");

  if (extra.country) url.searchParams.set("country", extra.country);
  if (extra.uuid) url.searchParams.set("uuid", extra.uuid);

  return url.toString();
};

const createAccessTokenFromCode = async ({ account, code }) => {
  if (!code) throw new Error("Authorization code is required");

  const apiPath = "/auth/token/create";
  const response = await callDarazApi({
    account,
    apiPath,
    method: "GET",
    params: { code },
    requiresAuth: false
  });

  const tokenPayload = normalizeTokenPayload(response);
  if (account) {
    await accountModel.updateTokens(account, tokenPayload);
    await safeCreateTokenLog({ account, action: "create", status: "success", message: "Token created", tokenPayload });
  }

  return { response, tokenPayload };
};

module.exports = {
  callDarazApi,
  createAccessTokenFromCode,
  ensureValidToken,
  refreshAccessToken,
  getAuthorizationUrl,
  generateDarazSign,
  normalizeTokenPayload
};

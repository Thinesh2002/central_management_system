const accountModel = require("../../models/marketplace/account_model");
const credentialModel = require("../../models/marketplace/credential_model");
const tokenService = require("../../services/marketplace/token_service");
const darazOAuthService = require("../../services/marketplace/daraz_OAuth_service");

function getCreatedAccountId(createdAccount) {
  if (!createdAccount) return null;

  if (typeof createdAccount === "number" || typeof createdAccount === "string") {
    return createdAccount;
  }

  return (
    createdAccount.id ||
    createdAccount.account_id ||
    createdAccount.insertId ||
    null
  );
}

function cleanValue(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  return value;
}

async function createMarketplaceAccount(req, res) {
  try {
    const body = req.body || {};

    const {
      platform_code,
      account_uid,
      account_name,
      account_code,
      country_code,
      seller_id,
      seller_email,
      store_url,
      api_base_url,
      is_sandbox,

      app_key,
      app_secret,
      access_token,
      refresh_token,
      access_token_expires_at,
      refresh_token_expires_at,

      consumer_key,
      consumer_secret,
    } = body;

    if (!platform_code || !account_uid || !account_name) {
      return res.status(400).json({
        success: false,
        message: "Platform code, account UID, and account name are required.",
      });
    }

    const normalizedPlatform = String(platform_code).trim().toUpperCase();

    const createdAccount = await accountModel.createAccount({
      platform_code: normalizedPlatform,
      account_uid,
      account_name,
      account_code,
      country_code,
      seller_id,
      seller_email,
      store_url,
      api_base_url,
      is_sandbox,
      status: normalizedPlatform === "DARAZ" ? "active" : "inactive",
      connection_status: access_token ? "connected" : "not_connected",
      created_by: req.user?.id || null,
    });

    const accountId = getCreatedAccountId(createdAccount);

    if (!accountId) {
      return res.status(500).json({
        success: false,
        message: "Account created, but account_id was not returned.",
        debug: createdAccount,
      });
    }

    if (normalizedPlatform === "DARAZ") {
      if (!app_key || !app_secret) {
        await accountModel.upsertAccountHealth(accountId, "DARAZ", {
          connection_status: "not_connected",
          token_status: "not_created",
          last_error: null,
        });

        return res.status(201).json({
          success: true,
          message: "Daraz account created. Add OAuth token later.",
          account_id: accountId,
          data: {
            account_id: accountId,
          },
        });
      }

      await credentialModel.upsertDarazCredentials({
        account_id: accountId,
        app_key: cleanValue(app_key),
        app_secret: cleanValue(app_secret),
        access_token: cleanValue(access_token),
        refresh_token: cleanValue(refresh_token),
        access_token_expires_at: cleanValue(access_token_expires_at),
        refresh_token_expires_at: cleanValue(refresh_token_expires_at),
        token_status: access_token ? "valid" : "not_created",
      });

      await accountModel.upsertAccountHealth(accountId, "DARAZ", {
        connection_status: access_token ? "connected" : "not_connected",
        token_status: access_token ? "valid" : "not_created",
        last_error: null,
      });
    }

    if (normalizedPlatform === "WOO" || normalizedPlatform === "WOOCOMMERCE") {
      await credentialModel.upsertCredentials({
        account_id: accountId,
        credential_type: "woocommerce_keys",
        consumer_key: cleanValue(consumer_key),
        consumer_secret: cleanValue(consumer_secret),
        token_status: "valid",
      });

      await accountModel.upsertAccountHealth(accountId, normalizedPlatform, {
        connection_status: consumer_key && consumer_secret ? "connected" : "not_connected",
        token_status: "valid",
        last_error: null,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Marketplace account created successfully.",
      account_id: accountId,
      data: {
        account_id: accountId,
      },
    });
  } catch (error) {
    console.error("[CREATE_MARKETPLACE_ACCOUNT_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create marketplace account.",
    });
  }
}

async function listMarketplaceAccounts(req, res) {
  try {
    const platformCode =
      req.query?.platform_code ||
      req.query?.platform ||
      req.query?.marketplace ||
      null;

    const accounts = await accountModel.getAllAccounts(
      platformCode
        ? {
            platform_code: platformCode,
          }
        : {}
    );

    return res.json({
      success: true,
      data: accounts,
      accounts,
    });
  } catch (error) {
    console.error("[LIST_MARKETPLACE_ACCOUNTS_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load marketplace accounts.",
    });
  }
}

async function checkSingleAccountToken(req, res) {
  try {
    const accountId =
      req.params.accountId ||
      req.params.account_id ||
      req.body?.account_id ||
      req.query?.account_id;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "account_id is required.",
      });
    }

    const result = await tokenService.getValidCredentialsForAccount(accountId);

    return res.json({
      success: true,
      message: "Account token is valid.",
      account: {
        id: result.account.id,
        account_uid: result.account.account_uid,
        account_name: result.account.account_name,
        platform_code: result.account.platform_code,
      },
    });
  } catch (error) {
    console.error("[CHECK_ACCOUNT_TOKEN_ERROR]:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Token check failed.",
    });
  }
}

async function checkAllDarazTokens(req, res) {
  try {
    const summary = await tokenService.checkAllDarazTokens();

    return res.json({
      success: true,
      message: "Daraz token check completed.",
      summary,
    });
  } catch (error) {
    console.error("[CHECK_ALL_DARAZ_TOKENS_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Daraz token check failed.",
    });
  }
}

async function getDarazReauthUrl(req, res) {
  try {
    const accountId =
      req.params.accountId ||
      req.params.account_id ||
      req.body?.account_id ||
      req.query?.account_id;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "account_id is required.",
      });
    }

    const auth_url = await darazOAuthService.buildDarazReauthUrl(accountId);

    return res.json({
      success: true,
      message: "Daraz reauthorization URL generated.",
      auth_url,
    });
  } catch (error) {
    console.error("[DARAZ_REAUTH_URL_ERROR]:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to generate Daraz reauthorization URL.",
    });
  }
}

async function handleDarazOAuthCallback(req, res) {
  try {
    const { code, state } = req.query;

    const account = await darazOAuthService.handleDarazOAuthCallback({
      code,
      state,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    return res.redirect(
      `${frontendUrl}/marketplace/accounts/${account.id}?reauth=success`
    );
  } catch (error) {
    console.error("[DARAZ_OAUTH_CALLBACK_ERROR]:", error);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const message = encodeURIComponent(
      error.message || "Daraz reauthorization failed."
    );

    return res.redirect(
      `${frontendUrl}/marketplace/accounts?reauth=failed&message=${message}`
    );
  }
}

module.exports = {
  createMarketplaceAccount,
  listMarketplaceAccounts,
  checkSingleAccountToken,
  checkAllDarazTokens,
  getDarazReauthUrl,
  handleDarazOAuthCallback,
};
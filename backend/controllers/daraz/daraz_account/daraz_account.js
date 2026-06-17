const accountModel = require("../../../models/daraz/daraz_account/daraz_account_model");
const darazApi = require("../../../services/daraz/daraz_api_client");

const hideSecrets = (account = {}) => ({
  ...account,
  app_secret: account.app_secret ? "[HIDDEN]" : null,
  app_secret_encrypted: account.app_secret_encrypted ? "[HIDDEN]" : null,
  access_token: account.access_token ? "[HIDDEN]" : null,
  refresh_token: account.refresh_token ? "[HIDDEN]" : null,
  has_access_token: !!account.access_token || !!account.has_access_token,
  has_refresh_token: !!account.refresh_token || !!account.has_refresh_token
});

const sellerError = (res, status, message, error = null, extra = {}) => res.status(status).json({
  success: false,
  message,
  error: error?.message || error || undefined,
  ...extra
});

exports.getAccounts = async (req, res) => {
  try {
    const accounts = await accountModel.getAllAccounts({
      activeOnly: req.query.active_only === "true",
      includeTokens: true
    });

    return res.status(200).json({
      success: true,
      total: accounts.length,
      accounts: accounts.map(hideSecrets)
    });
  } catch (error) {
    console.error("[CONTROLLER_ERROR][getAccounts]:", error.message);
    return sellerError(res, 500, "Daraz accounts could not be loaded. Please check the database connection and migration.", error);
  }
};

exports.getAccountByCode = async (req, res) => {
  try {
    const account = await accountModel.getAccountByCode(req.params.account_code);
    if (!account) return sellerError(res, 404, "Daraz account was not found. Please check the account code.");
    return res.status(200).json({ success: true, account: hideSecrets(account) });
  } catch (error) {
    return sellerError(res, 500, "Daraz account details could not be loaded.", error);
  }
};

exports.createAccount = async (req, res) => {
  try {
    const { account_code, account_name, seller_name } = req.body;
    if (!account_code || (!account_name && !seller_name)) {
      return sellerError(res, 400, "Account code and account name are required.");
    }

    await accountModel.createAccount(req.body);
    const account = await accountModel.getAccountByCode(account_code);
    return res.status(201).json({
      success: true,
      message: "Daraz account saved. Reconnect the account to authorize seller access.",
      account: hideSecrets(account)
    });
  } catch (error) {
    console.error("[CONTROLLER_ERROR][createAccount]:", error.message);
    return sellerError(res, 500, "Daraz account could not be saved. Please check duplicate account code or database structure.", error);
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const { account_code } = req.params;
    const affectedRows = await accountModel.updateAccount(account_code, req.body);
    if (!affectedRows) return sellerError(res, 404, "No Daraz account was updated. Please check the account code.");

    const account = await accountModel.getAccountByCode(account_code);
    return res.status(200).json({ success: true, message: "Daraz account updated successfully.", account: hideSecrets(account) });
  } catch (error) {
    return sellerError(res, 500, "Daraz account could not be updated.", error);
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const deleted = await accountModel.deleteAccount(req.params.account_code);
    if (!deleted) return sellerError(res, 404, "Daraz account was not found, so nothing was deleted.");
    return res.status(200).json({ success: true, message: "Daraz account deleted from the local system." });
  } catch (error) {
    return sellerError(res, 500, "Daraz account could not be deleted. Check if related records are locked by the database.", error);
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const account = await accountModel.getAccountByCode(req.params.account_code);
    if (!account) return sellerError(res, 404, "Daraz account not found. Please check the account code.", null, { status: "not_found" });

    const updated = await darazApi.refreshAccessToken(account);
    return res.status(200).json({
      success: true,
      status: "active",
      message: `Token refreshed successfully for ${account.account_code}. You can run product, order, and inventory sync now.`,
      account: hideSecrets(updated)
    });
  } catch (error) {
    let account = null;
    let authUrl = null;
    try {
      account = await accountModel.getAccountByCode(req.params.account_code);
      if (account) authUrl = darazApi.getAuthorizationUrl(account, { state: account.account_code });
    } catch (authError) {
      console.error("[DARAZ_AUTH_URL_BUILD_FAIL]:", authError.message);
    }

    return res.status(200).json({
      success: false,
      status: "reauth_required",
      message: "This Daraz seller account needs to be reconnected. Click Reconnect, login to Daraz Seller Center, then run sync again.",
      user_message: error.message,
      daraz_code: error.darazCode || error.responseData?.code || null,
      daraz_message: error.darazMessage || error.responseData?.message || error.responseData?.msg || null,
      auth_url: authUrl
    });
  }
};

exports.getAuthUrl = async (req, res) => {
  try {
    const account = await accountModel.getAccountByCode(req.params.account_code);
    if (!account) return sellerError(res, 404, "Daraz account not found.");

    const auth_url = darazApi.getAuthorizationUrl(account, {
      redirect_uri: req.query.redirect_uri,
      country: req.query.country,
      uuid: req.query.uuid,
      state: req.query.state || account.account_code
    });

    return res.status(200).json({
      success: true,
      message: "Open this link and authorize the seller account in Daraz Seller Center.",
      auth_url
    });
  } catch (error) {
    return sellerError(res, 500, "Daraz authorization link could not be generated. Check DARAZ_REDIRECT_URI, App Key, and App Secret.", error);
  }
};

exports.createTokenFromCode = async (req, res) => {
  try {
    const accountCode = req.params.account_code || req.query.state || req.query.account_code;
    const { code } = req.query;

    if (!accountCode) return sellerError(res, 400, "Account code is missing. Daraz callback must include state=ACCOUNT_CODE.");
    if (!code) return sellerError(res, 400, "Authorization code is missing from Daraz callback.");

    const account = await accountModel.getAccountByCode(accountCode);
    if (!account) return sellerError(res, 404, "Daraz account not found. Please create the account first.");

    const result = await darazApi.createAccessTokenFromCode({ account, code });
    const updated = await accountModel.getAccountByCode(accountCode);

    return res.status(200).json({
      success: true,
      status: "active",
      message: "Daraz seller account connected successfully. Tokens were saved and sync can run now.",
      account: hideSecrets(updated),
      response: result.response
    });
  } catch (error) {
    console.error("[DARAZ_TOKEN_CREATE_FAIL]:", error.response?.data || error.message);
    return sellerError(res, 500, "Daraz authorization could not be completed. The code may be expired or already used. Please reconnect again.", error);
  }
};

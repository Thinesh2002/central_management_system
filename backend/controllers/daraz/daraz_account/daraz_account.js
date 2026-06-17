const accountModel = require("../../../models/daraz/daraz_account/daraz_account_model");
const darazApi = require("../../../services/daraz/daraz_api_client");

const hideSecrets = (account = {}) => ({
  ...account,
  app_secret: account.app_secret ? "[HIDDEN]" : null,
  access_token: account.access_token ? "[HIDDEN]" : null,
  refresh_token: account.refresh_token ? "[HIDDEN]" : null
});

exports.getAccounts = async (req, res) => {
  try {
    const accounts = await accountModel.getAllAccounts({
      activeOnly: req.query.active_only !== "false",
      includeTokens: true
    });

    return res.status(200).json({
      success: true,
      total: accounts.length,
      accounts: accounts.map(hideSecrets)
    });
  } catch (error) {
    console.error("[CONTROLLER_ERROR][getAccounts]:", error.message);
    return res.status(500).json({ success: false, message: "Unable to retrieve Daraz accounts", error: error.message });
  }
};

exports.getAccountByCode = async (req, res) => {
  try {
    const account = await accountModel.getAccountByCode(req.params.account_code);
    if (!account) return res.status(404).json({ success: false, message: "Daraz account not found" });

    return res.status(200).json({ success: true, account: hideSecrets(account) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to retrieve Daraz account", error: error.message });
  }
};

exports.createAccount = async (req, res) => {
  try {
    const { account_code, account_name } = req.body;

    if (!account_code || !account_name) {
      return res.status(400).json({ success: false, message: "account_code and account_name are required" });
    }

    await accountModel.createAccount(req.body);
    const account = await accountModel.getAccountByCode(account_code);

    return res.status(201).json({ success: true, message: "Daraz account saved", account: hideSecrets(account) });
  } catch (error) {
    console.error("[CONTROLLER_ERROR][createAccount]:", error.message);
    return res.status(500).json({ success: false, message: "Unable to save Daraz account", error: error.message });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const { account_code } = req.params;
    const affectedRows = await accountModel.updateAccount(account_code, req.body);

    if (!affectedRows) return res.status(404).json({ success: false, message: "No account updated" });

    const account = await accountModel.getAccountByCode(account_code);
    return res.status(200).json({ success: true, message: "Daraz account updated", account: hideSecrets(account) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to update Daraz account", error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const account = await accountModel.getAccountByCode(req.params.account_code);
    if (!account) {
      return res.status(404).json({
        success: false,
        status: "not_found",
        message: "Daraz account not found. Please check the account code and try again."
      });
    }

    const updated = await darazApi.refreshAccessToken(account);
    return res.status(200).json({
      success: true,
      status: "active",
      message: `Token refreshed successfully for ${account.account_code}. You can run product and order sync now.`,
      account: hideSecrets(updated)
    });
  } catch (error) {
    let account = null;
    let authUrl = null;

    try {
      account = await accountModel.getAccountByCode(req.params.account_code);
      if (account) {
        authUrl = darazApi.getAuthorizationUrl(account, { state: account.account_code });
      }
    } catch (authError) {
      console.error("[DARAZ_AUTH_URL_BUILD_FAIL]:", authError.message);
    }

    const expectedTokenFailure =
      error?.darazCode ||
      error?.responseData?.code ||
      String(error?.message || "").toLowerCase().includes("refresh token") ||
      String(error?.message || "").toLowerCase().includes("re-authorize") ||
      String(error?.message || "").toLowerCase().includes("token refresh failed");

    // Return 200 for expected seller-token failures so the UI can show a calm seller-central style action message.
    // True server errors, such as missing table or crashed DB connection, still return 500 below.
    if (expectedTokenFailure || authUrl) {
      return res.status(200).json({
        success: false,
        status: "reauth_required",
        message: "Token refresh could not be completed. Please re-authorize this Daraz seller account, then run sync again.",
        user_message: error.message,
        daraz_code: error.darazCode || error.responseData?.code || null,
        daraz_message: error.darazMessage || error.responseData?.message || error.responseData?.msg || null,
        auth_url: authUrl
      });
    }

    console.error("[CONTROLLER_ERROR][refreshToken]:", error);
    return res.status(500).json({
      success: false,
      status: "server_error",
      message: "Token refresh failed because the backend could not complete the request. Check backend logs and database migration.",
      error: error.message
    });
  }
};

exports.getAuthUrl = async (req, res) => {
  try {
    const account = await accountModel.getAccountByCode(req.params.account_code);
    if (!account) return res.status(404).json({ success: false, message: "Daraz account not found" });

    const auth_url = darazApi.getAuthorizationUrl(account, {
      redirect_uri: req.query.redirect_uri,
      country: req.query.country,
      uuid: req.query.uuid,
      state: req.query.state || account.account_code
    });

    return res.status(200).json({
      success: true,
      message: "Open this link and login to Daraz Seller Center to authorize this account.",
      auth_url
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to generate Daraz authorization URL", error: error.message });
  }
};

exports.createTokenFromCode = async (req, res) => {
  try {
    const { account_code } = req.params;
    const { code } = req.query;

    const account = await accountModel.getAccountByCode(account_code);
    if (!account) return res.status(404).json({ success: false, message: "Daraz account not found" });
    if (!code) return res.status(400).json({ success: false, message: "code query parameter is required" });

    const result = await darazApi.createAccessTokenFromCode({ account, code });
    return res.status(200).json({
      success: true,
      message: "Daraz account authorized successfully. Token created and saved.",
      response: result.response
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Daraz token create failed", error: error.message });
  }
};

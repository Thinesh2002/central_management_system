const accountModel = require("../../models/daraz/daraz_account/daraz_account_model");
const darazApi = require("../../services/daraz/daraz_api_client");

exports.createAccessToken = async (req, res) => {
  try {
    const { code, account_code } = req.query;

    if (!code) {
      return res.status(400).json({ success: false, message: "Authorization code is missing" });
    }

    const account = account_code ? await accountModel.getAccountByCode(account_code) : await accountModel.getDefaultAccount();
    const result = await darazApi.createAccessTokenFromCode({ account, code });

    return res.status(200).json({
      success: true,
      message: account ? "Token created and saved successfully" : "Token created successfully. Save it to daraz_accounts.",
      account_code: account?.account_code || null,
      data: result.response
    });
  } catch (error) {
    console.error("[DARAZ_TOKEN_CREATE_FAIL]:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create Daraz access token",
      error: error.response?.data || error.message
    });
  }
};

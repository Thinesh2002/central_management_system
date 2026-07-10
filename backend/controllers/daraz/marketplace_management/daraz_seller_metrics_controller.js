const asyncHandler = require("../../../middleware/async_handler");
const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");
const darazSellerMetricsService = require("../../../services/daraz/marketplace_management/daraz_seller_metrics_service");

const getMetrics = asyncHandler(async (req, res) => {
  const { accountId } = req.params;

  const account = await accountModel.findById(accountId);
  if (!account) {
    return res.status(404).json({ success: false, message: "Marketplace account not found." });
  }

  const credentials = await credentialModel.findByAccountId(accountId);
  if (!credentials?.access_token) {
    return res.status(400).json({ success: false, message: "Daraz access token missing for this account." });
  }

  const response = await darazSellerMetricsService.getSellerMetrics({ account, credentials });

  return res.json({ success: true, data: response?.data?.data || null });
});

module.exports = { getMetrics };

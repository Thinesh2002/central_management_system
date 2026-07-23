const brighthubProductSyncService = require("../../../services/brighthub/product/brighthub_product_sync_service");
const brighthubProductModel = require("../../../models/brighthub/product/brighthub_product_model");

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || "Something went wrong.";
}

function getAccountId(req) {
  return req?.params?.accountId;
}

function getBhid(req) {
  return req?.params?.bhid;
}

async function syncBrightHubProducts(req, res) {
  try {
    const accountId = getAccountId(req);

    if (!accountId) {
      return res.status(400).json({ success: false, message: "Account ID is required." });
    }

    const result = await brighthubProductSyncService.syncBrightHubProductsForAccount(accountId, {
      triggered_by_type: "user",
    });

    return res.json({ success: true, message: "BrightHub product sync completed.", data: result });
  } catch (error) {
    console.error("[SYNC_BRIGHTHUB_PRODUCTS_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "BrightHub product sync failed.",
      error: getErrorMessage(error),
    });
  }
}

async function getSyncedBrightHubProducts(req, res) {
  try {
    const accountId = getAccountId(req);

    if (!accountId) {
      return res.status(400).json({ success: false, message: "Account ID is required." });
    }

    const result = await brighthubProductModel.listSyncedBrightHubProducts(accountId, {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
    });

    return res.json({
      success: true,
      total: result.total || 0,
      page: result.page || 1,
      limit: result.limit || 50,
      data: Array.isArray(result.data) ? result.data : [],
    });
  } catch (error) {
    console.error("[GET_SYNCED_BRIGHTHUB_PRODUCTS_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load synced BrightHub products.",
      error: getErrorMessage(error),
    });
  }
}

async function getSyncedBrightHubProductDetail(req, res) {
  try {
    const accountId = getAccountId(req);
    const bhid = getBhid(req);

    if (!accountId) {
      return res.status(400).json({ success: false, message: "Account ID is required." });
    }

    if (!bhid) {
      return res.status(400).json({ success: false, message: "BHID is required." });
    }

    const product = await brighthubProductModel.getSyncedBrightHubProductDetail(accountId, bhid);

    if (!product) {
      return res.status(404).json({ success: false, message: "BrightHub product not found." });
    }

    return res.json({ success: true, data: product });
  } catch (error) {
    console.error("[GET_SYNCED_BRIGHTHUB_PRODUCT_DETAIL_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load BrightHub product details.",
      error: getErrorMessage(error),
    });
  }
}

module.exports = {
  syncBrightHubProducts,
  getSyncedBrightHubProducts,
  getSyncedBrightHubProductDetail,
};

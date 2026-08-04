const brighthubProductSyncService = require("../../../services/brighthub/product/brighthub_product_sync_service");
const brighthubProductModel = require("../../../models/brighthub/product/brighthub_product_model");
const brighthubModel = require("../../../models/marketplace/brighthub/brighthub_model");
const brighthubApi = require("../../../services/marketplace/brighthub/brighthub_api_service");

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

// Live fetch straight from BrightHub (not the local mirror) - used to
// prefill the Edit form with the freshest full product object, since
// BrightHub's PUT is a full replace and editing from stale local data
// could silently wipe fields the form doesn't expose.
async function getLiveBrightHubProduct(req, res) {
  const startedAt = new Date();
  const accountId = getAccountId(req);
  const bhid = getBhid(req);

  try {
    if (!accountId) {
      return res.status(400).json({ success: false, message: "Account ID is required." });
    }

    if (!bhid) {
      return res.status(400).json({ success: false, message: "BHID is required." });
    }

    const credentials = await brighthubModel.getBrightHubCredentials(accountId);
    const product = await brighthubApi.getProduct(credentials, bhid);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found on BrightHub." });
    }

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: `/products/${bhid}`,
      http_method: "GET",
      request_type: "products",
      response_status_code: 200,
      api_status: "success",
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.json({ success: true, data: product });
  } catch (error) {
    console.error("[GET_LIVE_BRIGHTHUB_PRODUCT_ERROR]:", error);

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: `/products/${bhid}`,
      http_method: "GET",
      request_type: "products",
      response_status_code: error?.response?.status || 500,
      api_status: "failed",
      error_message: getErrorMessage(error),
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to load the live BrightHub product.",
      error: getErrorMessage(error),
    });
  }
}

async function createBrightHubProduct(req, res) {
  const startedAt = new Date();
  const accountId = getAccountId(req);

  try {
    if (!accountId) {
      return res.status(400).json({ success: false, message: "Account ID is required." });
    }

    const credentials = await brighthubModel.getBrightHubCredentials(accountId);
    const product = await brighthubApi.createProduct(credentials, req.body || {});

    if (product?.bhid) {
      await brighthubProductModel.upsertBrightHubProduct(accountId, product);
    }

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: "/products",
      http_method: "POST",
      request_type: "products",
      response_status_code: 201,
      api_status: "success",
      request_summary: req.body,
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(201).json({ success: true, message: "Website product created.", data: product });
  } catch (error) {
    console.error("[CREATE_BRIGHTHUB_PRODUCT_ERROR]:", error);

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: "/products",
      http_method: "POST",
      request_type: "products",
      response_status_code: error?.response?.status || 500,
      api_status: "failed",
      error_message: getErrorMessage(error),
      request_summary: req.body,
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Failed to create the Website product.",
      error: getErrorMessage(error),
    });
  }
}

async function updateBrightHubProduct(req, res) {
  const startedAt = new Date();
  const accountId = getAccountId(req);
  const bhid = getBhid(req);

  try {
    if (!accountId) {
      return res.status(400).json({ success: false, message: "Account ID is required." });
    }

    if (!bhid) {
      return res.status(400).json({ success: false, message: "BHID is required." });
    }

    const credentials = await brighthubModel.getBrightHubCredentials(accountId);
    const product = await brighthubApi.updateProduct(credentials, bhid, req.body || {});

    await brighthubProductModel.upsertBrightHubProduct(accountId, product || { ...req.body, bhid });

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: `/products/${bhid}`,
      http_method: "PUT",
      request_type: "products",
      response_status_code: 200,
      api_status: "success",
      request_summary: req.body,
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.json({ success: true, message: "Website product updated.", data: product });
  } catch (error) {
    console.error("[UPDATE_BRIGHTHUB_PRODUCT_ERROR]:", error);

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: `/products/${bhid}`,
      http_method: "PUT",
      request_type: "products",
      response_status_code: error?.response?.status || 500,
      api_status: "failed",
      error_message: getErrorMessage(error),
      request_summary: req.body,
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Failed to update the Website product.",
      error: getErrorMessage(error),
    });
  }
}

async function deleteBrightHubProduct(req, res) {
  const startedAt = new Date();
  const accountId = getAccountId(req);
  const bhid = getBhid(req);

  try {
    if (!accountId) {
      return res.status(400).json({ success: false, message: "Account ID is required." });
    }

    if (!bhid) {
      return res.status(400).json({ success: false, message: "BHID is required." });
    }

    const credentials = await brighthubModel.getBrightHubCredentials(accountId);
    await brighthubApi.deleteProduct(credentials, bhid);
    await brighthubProductModel.deleteSyncedBrightHubProduct(accountId, bhid);

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: `/products/${bhid}`,
      http_method: "DELETE",
      request_type: "products",
      response_status_code: 200,
      api_status: "success",
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.json({ success: true, message: "Website product deleted." });
  } catch (error) {
    console.error("[DELETE_BRIGHTHUB_PRODUCT_ERROR]:", error);

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: `/products/${bhid}`,
      http_method: "DELETE",
      request_type: "products",
      response_status_code: error?.response?.status || 500,
      api_status: "failed",
      error_message: getErrorMessage(error),
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Failed to delete the Website product. Remove any attached variants first if this is a variation parent.",
      error: getErrorMessage(error),
    });
  }
}

async function uploadBrightHubMedia(req, res) {
  const startedAt = new Date();
  const accountId = getAccountId(req);

  try {
    if (!accountId) {
      return res.status(400).json({ success: false, message: "Account ID is required." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "An image file is required." });
    }

    const credentials = await brighthubModel.getBrightHubCredentials(accountId);
    const media = await brighthubApi.uploadMedia(
      credentials,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: "/media/upload",
      http_method: "POST",
      request_type: "media",
      response_status_code: 200,
      api_status: "success",
      request_summary: { file_name: req.file.originalname, size_bytes: req.file.size },
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(201).json({ success: true, message: "Image uploaded.", data: media });
  } catch (error) {
    console.error("[UPLOAD_BRIGHTHUB_MEDIA_ERROR]:", error);

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: "/media/upload",
      http_method: "POST",
      request_type: "media",
      response_status_code: error?.response?.status || 500,
      api_status: "failed",
      error_message: getErrorMessage(error),
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Failed to upload the image to BrightHub.",
      error: getErrorMessage(error),
    });
  }
}

module.exports = {
  syncBrightHubProducts,
  getSyncedBrightHubProducts,
  getSyncedBrightHubProductDetail,
  getLiveBrightHubProduct,
  createBrightHubProduct,
  updateBrightHubProduct,
  deleteBrightHubProduct,
  uploadBrightHubMedia,
};

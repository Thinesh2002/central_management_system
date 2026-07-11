const wooProductSyncService = require("../../../services/woo/product/woo_product_sync_service");
const wooProductModel = require("../../../models/woo/product/woo_product_model");

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong."
  );
}

function getAccountId(req) {
  return req?.params?.accountId;
}

function getWooProductId(req) {
  return req?.params?.wooProductId;
}

async function syncWooProducts(req, res) {
  try {
    const accountId = getAccountId(req);

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "Account ID is required.",
      });
    }

    if (
      !wooProductSyncService ||
      typeof wooProductSyncService.syncWooProductsForAccount !== "function"
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Woo product sync service function missing: syncWooProductsForAccount.",
      });
    }

    const result = await wooProductSyncService.syncWooProductsForAccount(
      accountId,
      {
        triggered_by_type: "user",
      }
    );

    return res.json({
      success: true,
      message: "WooCommerce product sync completed.",
      data: result,
    });
  } catch (error) {
    console.error("[SYNC_WOO_PRODUCTS_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "WooCommerce product sync failed.",
      error: getErrorMessage(error),
    });
  }
}


async function getSyncedWooProducts(req, res) {
  try {
    const accountId = getAccountId(req);

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "Account ID is required.",
      });
    }

    if (
      !wooProductModel ||
      typeof wooProductModel.listSyncedWooProducts !== "function"
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Woo product model function missing: listSyncedWooProducts.",
      });
    }

    const result = await wooProductModel.listSyncedWooProducts(accountId, {
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
    console.error("[GET_SYNCED_WOO_PRODUCTS_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load synced WooCommerce products.",
      error: getErrorMessage(error),
    });
  }
}

async function getSyncedWooProductDetail(req, res) {
  try {
    const accountId = getAccountId(req);
    const wooProductId = getWooProductId(req);

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "Account ID is required.",
      });
    }

    if (!wooProductId) {
      return res.status(400).json({
        success: false,
        message: "Woo product ID is required.",
      });
    }

    if (
      !wooProductModel ||
      typeof wooProductModel.getSyncedWooProductDetail !== "function"
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Woo product model function missing: getSyncedWooProductDetail.",
      });
    }

    const result = await wooProductModel.getSyncedWooProductDetail(
      accountId,
      wooProductId
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "WooCommerce product not found.",
      });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[GET_SYNCED_WOO_PRODUCT_DETAIL_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load WooCommerce product details.",
      error: getErrorMessage(error),
    });
  }
}

module.exports = {
  syncWooProducts,
  getSyncedWooProducts,
  getSyncedWooProductDetail,
};
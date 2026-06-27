const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");

const darazProductSyncService = require("../../../services/daraz/product_management/daraz_product_sync_service");
const darazProductSyncModel = require("../../../models/daraz/product_management/daraz_product_sync_model");

function parseBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;

  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;

  return fallback;
}

function normalizeProductDates(product) {
  if (!product) return null;

  return {
    ...product,
    daraz_created_at: product.daraz_created_at || null,
    daraz_updated_at: product.daraz_updated_at || null,
    last_synced_at: product.last_synced_at || null,
    created_at: product.created_at || null,
    updated_at: product.updated_at || null,
  };
}

async function manualSync(req, res) {
  try {
    const accountId = req.params.accountId || req.body.account_id;
    const filter = req.body.filter || req.query.filter || "all_products";
    const withDetail = parseBoolean(
      req.body.withDetail ?? req.query.withDetail,
      true
    );

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "Daraz account ID is required.",
      });
    }

    const account = await accountModel.findById(accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Daraz account not found.",
      });
    }

    const credentials = await credentialModel.findByAccountId(accountId);

    if (!credentials) {
      return res.status(404).json({
        success: false,
        message: "Daraz credentials not found for this account.",
      });
    }

    if (!credentials.access_token) {
      return res.status(400).json({
        success: false,
        message:
          "Daraz access token missing. Please authorize this Daraz account first.",
      });
    }

    const result = await darazProductSyncService.syncDarazProducts({
      account,
      credentials,
      sync_type: "manual",
      withDetail,
      filter,
    });

    return res.json({
      success: true,
      message: "Daraz products synced successfully.",
      data: result,
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_MANUAL_SYNC_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      statusCode: error?.statusCode || null,
      details: error?.details || null,
    });

    return res.status(error?.statusCode || 500).json({
      success: false,
      message: "Failed to sync Daraz products.",
      error: error.message,
      code: error?.code || null,
      details: error?.details || null,
    });
  }
}

async function previewProducts(req, res) {
  try {
    const {
      account_id,
      search,
      status,
      sync_status,
      min_price,
      max_price,
      stock,
      limit,
      offset,
      with_count,
    } = req.query;

    const result = await darazProductSyncModel.listPreview({
      account_id,
      search,
      status,
      sync_status,
      min_price,
      max_price,
      stock,
      limit,
      offset,
      with_count: with_count === "true" || with_count === "1",
    });

    return res.json({
      success: true,
      message: "Daraz product preview loaded.",
      data: result,
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_PREVIEW_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      sqlMessage: error?.sqlMessage || null,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to load Daraz product preview.",
      error: error.message,
    });
  }
}

async function syncRuns(req, res) {
  try {
    const { account_id, status, limit } = req.query;

    const rows = await darazProductSyncModel.listRuns({
      account_id,
      status,
      limit,
    });

    return res.json({
      success: true,
      message: "Daraz sync runs loaded.",
      data: rows,
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_RUNS_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      sqlMessage: error?.sqlMessage || null,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to load Daraz sync history.",
      error: error.message,
    });
  }
}

async function viewProduct(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required.",
      });
    }

    const product = await darazProductSyncModel.getPreviewById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Daraz product not found.",
      });
    }

    const variants = await darazProductSyncModel.getVariantsByProduct({
      account_id: product.account_id,
      daraz_item_id: product.daraz_item_id,
    });

    return res.json({
      success: true,
      message: "Daraz product loaded.",
      data: {
        product: normalizeProductDates(product),
        variants,
      },
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_VIEW_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      sqlMessage: error?.sqlMessage || null,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to load Daraz product.",
      error: error.message,
    });
  }
}

async function viewProductByItemId(req, res) {
  try {
    const { accountId, itemId } = req.params;

    if (!accountId || !itemId) {
      return res.status(400).json({
        success: false,
        message: "Account ID and Daraz item ID are required.",
      });
    }

    const product = await darazProductSyncModel.getPreviewByDarazItemId({
      account_id: accountId,
      daraz_item_id: itemId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Daraz product not found.",
      });
    }

    const variants = await darazProductSyncModel.getVariantsByProduct({
      account_id: product.account_id,
      daraz_item_id: product.daraz_item_id,
    });

    return res.json({
      success: true,
      message: "Daraz product loaded.",
      data: {
        product: normalizeProductDates(product),
        variants,
      },
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_VIEW_ITEM_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      sqlMessage: error?.sqlMessage || null,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to load Daraz product by item ID.",
      error: error.message,
    });
  }
}

async function productRawJson(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required.",
      });
    }

    const row = await darazProductSyncModel.getProductRawJson(id);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Daraz product raw data not found.",
      });
    }

    return res.json({
      success: true,
      message: "Daraz product raw data loaded.",
      data: row,
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_RAW_JSON_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      sqlMessage: error?.sqlMessage || null,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to load Daraz product raw data.",
      error: error.message,
    });
  }
}

async function productStats(req, res) {
  try {
    const { account_id } = req.query;

    const [stats, status_summary, category_summary, latest_run, total] =
      await Promise.all([
        darazProductSyncModel.getProductStats({ account_id }),
        darazProductSyncModel.getStatusSummary({ account_id }),
        darazProductSyncModel.getCategorySummary({ account_id }),
        darazProductSyncModel.getLatestRun({ account_id }),
        darazProductSyncModel.countProducts({ account_id }),
      ]);

    return res.json({
      success: true,
      message: "Daraz product stats loaded.",
      data: {
        total,
        stats,
        status_summary,
        category_summary,
        latest_run,
      },
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_STATS_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      sqlMessage: error?.sqlMessage || null,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to load Daraz product stats.",
      error: error.message,
    });
  }
}

async function updateSyncStatus(req, res) {
  try {
    const { id } = req.params;
    const { sync_status } = req.body;

    if (!id || !sync_status) {
      return res.status(400).json({
        success: false,
        message: "Product ID and sync status are required.",
      });
    }

    await darazProductSyncModel.updateProductSyncStatus({
      id,
      sync_status,
    });

    return res.json({
      success: true,
      message: "Daraz product sync status updated.",
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_STATUS_UPDATE_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      sqlMessage: error?.sqlMessage || null,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to update Daraz product sync status.",
      error: error.message,
    });
  }
}

async function updateLocalLink(req, res) {
  try {
    const { id } = req.params;
    const { local_product_id, local_variant_id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required.",
      });
    }

    const result = await darazProductSyncModel.updateProductLocalLink({
      id,
      local_product_id,
      local_variant_id,
    });

    return res.json({
      success: true,
      message: result?.skipped
        ? result.reason
        : "Daraz product local link updated.",
      data: result,
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_LOCAL_LINK_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      sqlMessage: error?.sqlMessage || null,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to update Daraz product local link.",
      error: error.message,
    });
  }
}

async function deletePreviewProduct(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required.",
      });
    }

    const result = await darazProductSyncModel.deletePreviewProduct(id);

    if (!result.deleted) {
      return res.status(404).json({
        success: false,
        message: result.reason || "Daraz product not found.",
      });
    }

    return res.json({
      success: true,
      message: "Daraz preview product deleted.",
      data: result,
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_DELETE_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      sqlMessage: error?.sqlMessage || null,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to delete Daraz preview product.",
      error: error.message,
    });
  }
}

async function bulkDeleteByAccount(req, res) {
  try {
    const { account_id } = req.body;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        message: "Account ID is required.",
      });
    }

    const deleted = await darazProductSyncModel.bulkDeleteByAccount(account_id);

    return res.json({
      success: true,
      message: "Daraz preview products deleted for this account.",
      data: {
        deleted,
      },
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_BULK_DELETE_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      sqlMessage: error?.sqlMessage || null,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to bulk delete Daraz preview products.",
      error: error.message,
    });
  }
}

module.exports = {
  manualSync,
  previewProducts,
  syncRuns,
  viewProduct,
  viewProductByItemId,
  productRawJson,
  productStats,
  updateSyncStatus,
  updateLocalLink,
  deletePreviewProduct,
  bulkDeleteByAccount,
};
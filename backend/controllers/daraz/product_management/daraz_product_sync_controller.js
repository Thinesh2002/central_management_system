const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");

const darazProductSyncService = require("../../../services/daraz/product_management/daraz_product_sync_service");
const darazProductSyncModel = require("../../../models/daraz/product_management/daraz_product_sync_model");
const darazProductApiService = require("../../../services/marketplace/daraz_product_api_service");

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

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, short_description, brand, price, sale_price, quantity } = req.body || {};

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

    if (!product.seller_sku) {
      return res.status(400).json({
        success: false,
        message: "This Daraz product has no Seller SKU, so it cannot be edited.",
      });
    }

    const account = await accountModel.getAccountById(product.account_id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Marketplace account for this product was not found.",
      });
    }

    const credentials = await credentialModel.findByAccountId(product.account_id);

    if (!credentials?.access_token) {
      return res.status(401).json({
        success: false,
        message: "This Daraz account is not connected. Please reconnect it before editing products.",
      });
    }

    const hasPriceOrQty =
      price !== undefined || sale_price !== undefined || quantity !== undefined;
    const hasNameChange =
      (name !== undefined && String(name).trim() !== "") ||
      (short_description !== undefined && String(short_description).trim() !== "") ||
      (brand !== undefined && String(brand).trim() !== "");

    if (!hasPriceOrQty && !hasNameChange) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update (name, description, brand, price, sale price or quantity).",
      });
    }

    if (hasPriceOrQty) {
      await darazProductApiService.updateDarazPriceQuantity({
        account,
        credentials,
        itemId: product.daraz_item_id,
        sellerSku: product.seller_sku,
        price,
        salePrice: sale_price,
        quantity,
      });
    }

    if (hasNameChange) {
      await darazProductApiService.updateDarazProductDetails({
        account,
        credentials,
        itemId: product.daraz_item_id,
        primaryCategory: product.primary_category,
        sellerSku: product.seller_sku,
        name: name || product.name,
        shortDescription: short_description,
        brand,
      });
    }

    const result = await darazProductSyncModel.updateLocalFields(id, {
      name: name !== undefined ? name : undefined,
      short_description,
      brand,
      price,
      sale_price,
      quantity,
    });

    return res.json({
      success: true,
      message: "Daraz product updated successfully and pushed to Daraz.",
      data: result.product,
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_UPDATE_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      daraz: error?.daraz || null,
    });

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error?.daraz?.message ||
        error.message ||
        "Failed to update Daraz product.",
      error: error?.daraz || error.message,
    });
  }
}

async function deletePreviewProduct(req, res) {
  try {
    const { id } = req.params;
    const deactivateOnDaraz = String(req.query?.deactivate_on_daraz || "true") !== "false";

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required.",
      });
    }

    const product = await darazProductSyncModel.getPreviewById(id);

    let darazDeactivationWarning = null;

    if (product && deactivateOnDaraz && product.daraz_item_id) {
      try {
        const account = await accountModel.getAccountById(product.account_id);
        const credentials = await credentialModel.findByAccountId(product.account_id);

        if (account && credentials?.access_token) {
          await darazProductApiService.deactivateDarazProduct({
            account,
            credentials,
            itemId: product.daraz_item_id,
          });
        } else {
          darazDeactivationWarning =
            "Account not connected — product was removed from this system only, not from the live Daraz store.";
        }
      } catch (darazError) {
        console.error("[DARAZ_PRODUCT_DEACTIVATE_ERROR]", {
          message: darazError?.message,
          daraz: darazError?.daraz || null,
        });

        darazDeactivationWarning =
          darazError?.daraz?.message ||
          "Could not deactivate this product on Daraz. It was removed from this system only — please check it manually in Seller Center.";
      }
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
      message: darazDeactivationWarning
        ? "Daraz product removed from this system, with a warning."
        : "Daraz product deactivated on Daraz and removed from this system.",
      warning: darazDeactivationWarning,
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
  updateProduct,
  deletePreviewProduct,
  bulkDeleteByAccount,
};
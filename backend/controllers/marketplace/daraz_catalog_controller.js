const tokenService = require("../../services/marketplace/token_service");
const darazProductApiService = require("../../services/marketplace/daraz_product_api_service");
const darazCatalogApiService = require("../../services/marketplace/daraz_catalog_api_service");
const darazProductSyncService = require("../../services/daraz/product_management/daraz_product_sync_service");

function handleError(res, error, fallback) {
  console.error("[DARAZ_CATALOG_ERROR]", {
    message: error?.message,
    code: error?.code || null,
    daraz: error?.daraz || null,
  });

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error?.daraz?.message || error.message || fallback,
    error: error?.daraz || error.message,
  });
}

async function withAccount(req) {
  const accountId = req.params.accountId;
  return tokenService.getValidCredentialsForAccount(accountId);
}

// category/tree/get, category/attributes/get and category/brands/query all
// document access_token as NOT required (app_key/app_secret only) — use the
// lightweight credential fetch so a stale/invalid refresh token on the
// account doesn't block these calls.
async function withAppCredentials(req) {
  const accountId = req.params.accountId;
  return tokenService.getAppCredentialsForAccount(accountId);
}

async function categoryTree(req, res) {
  try {
    const { account, credentials } = await withAppCredentials(req);
    const result = await darazCatalogApiService.getDarazCategoryTree({ account, credentials });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, "Failed to fetch Daraz category tree.");
  }
}

async function categoryAttributes(req, res) {
  try {
    const { account, credentials } = await withAppCredentials(req);
    const result = await darazCatalogApiService.getDarazCategoryAttributes({
      account,
      credentials,
      primaryCategoryId: req.query.primary_category_id,
      languageCode: req.query.language_code,
    });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, "Failed to fetch Daraz category attributes.");
  }
}

async function brands(req, res) {
  try {
    const { account, credentials } = await withAppCredentials(req);
    const result = await darazCatalogApiService.getDarazBrandsByPage({
      account,
      credentials,
      startRow: req.query.startRow,
      pageSize: req.query.pageSize,
    });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, "Failed to fetch Daraz brands.");
  }
}

async function qcStatus(req, res) {
  try {
    const { account, credentials } = await withAccount(req);
    const result = await darazCatalogApiService.getDarazQcStatus({
      account,
      credentials,
      offset: req.query.offset,
      limit: req.query.limit,
      sellerSkus: req.query.seller_skus ? JSON.parse(req.query.seller_skus) : [],
    });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, "Failed to fetch Daraz QC status.");
  }
}

async function createProduct(req, res) {
  try {
    const { account, credentials } = await withAccount(req);
    const result = await darazProductApiService.createDarazProduct({
      account,
      credentials,
      ...req.body,
    });

    const newItemId = result?.data?.data?.item_id || result?.data?.item_id;

    if (newItemId) {
      try {
        await darazProductSyncService.syncSingleDarazProductByItemId({
          account,
          credentials,
          item_id: newItemId,
        });
      } catch (mirrorError) {
        console.error("[DARAZ_CATALOG_MIRROR_SYNC_ERROR]", {
          item_id: newItemId,
          message: mirrorError?.message,
        });
      }
    }

    return res.json(result);
  } catch (error) {
    return handleError(res, error, "Failed to create Daraz product.");
  }
}

async function migrateImage(req, res) {
  try {
    const { account, credentials } = await withAccount(req);
    const result = await darazCatalogApiService.migrateDarazImage({
      account,
      credentials,
      imageUrl: req.body.image_url,
    });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, "Failed to migrate image to Daraz.");
  }
}

async function migrateImages(req, res) {
  try {
    const { account, credentials } = await withAccount(req);
    const result = await darazCatalogApiService.migrateDarazImages({
      account,
      credentials,
      imageUrls: req.body.image_urls,
    });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, "Failed to migrate images to Daraz.");
  }
}

async function imageMigrationResult(req, res) {
  try {
    const { account, credentials } = await withAccount(req);
    const result = await darazCatalogApiService.getDarazImageMigrationResult({
      account,
      credentials,
      batchId: req.query.batch_id,
    });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, "Failed to fetch Daraz image migration result.");
  }
}

async function setImages(req, res) {
  try {
    const { account, credentials } = await withAccount(req);
    const result = await darazCatalogApiService.setDarazSkuImages({
      account,
      credentials,
      skuId: req.body.sku_id,
      imageUrls: req.body.image_urls || [],
    });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, "Failed to set Daraz SKU images.");
  }
}

async function uploadImage(req, res) {
  try {
    const { account, credentials } = await withAccount(req);

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image file is required." });
    }

    const result = await darazCatalogApiService.uploadDarazImage({
      account,
      credentials,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
    });
    return res.json(result);
  } catch (error) {
    return handleError(res, error, "Failed to upload image to Daraz.");
  }
}

module.exports = {
  categoryTree,
  categoryAttributes,
  brands,
  qcStatus,
  createProduct,
  migrateImage,
  migrateImages,
  imageMigrationResult,
  setImages,
  uploadImage,
};

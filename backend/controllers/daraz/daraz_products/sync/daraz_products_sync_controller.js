const accountModel = require("../../../../models/daraz/daraz_account/daraz_account_model");
const productSyncModel = require("../../../../models/daraz/products_models/sync/daraz_product_sync_model");
const productSyncService = require("../../../../services/daraz/daraz_product_sync_service");

exports.syncAllDarazProducts = async (req, res) => {
  try {
    const force = req.query.force === "true";
    const accountCode = req.query.account_code || null;
    const summary = await productSyncService.syncAllProducts({ force, syncType: "manual", accountCode });

    return res.status(200).json({
      success: true,
      execution_mode: force ? "FORCED_SYNC" : "MANUAL_SYNC",
      summary
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_SYNC_CONTROLLER_FAIL]:", error.message);
    return res.status(500).json({
      success: false,
      message: "Daraz product sync failed",
      error: error.message
    });
  }
};

exports.syncSingleDarazAccountProducts = async (req, res) => {
  try {
    const { account_code } = req.params;
    const account = await accountModel.getAccountByCode(account_code);

    if (!account) {
      return res.status(404).json({ success: false, message: "Daraz account not found" });
    }

    const result = await productSyncService.syncSingleAccountProducts(account, {
      force: req.query.force === "true",
      syncType: "manual"
    });

    return res.status(result.success || result.partial ? 200 : 500).json({
      success: result.success || result.partial,
      result
    });
  } catch (error) {
    console.error("[DARAZ_SINGLE_PRODUCT_SYNC_CONTROLLER_FAIL]:", error.message);
    return res.status(500).json({ success: false, message: "Daraz account product sync failed", error: error.message });
  }
};

exports.runProductSyncJob = async () => {
  return productSyncService.syncAllProducts({ force: false, syncType: "cron" });
};

exports.getSyncedProducts = async (req, res) => {
  try {
    const result = await productSyncModel.getProducts({
      page: req.query.page,
      limit: req.query.limit,
      account_code: req.query.account_code,
      status: req.query.status,
      search: req.query.search
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("[DARAZ_GET_PRODUCTS_FAIL]:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch Daraz synced products", error: error.message });
  }
};

exports.getSyncedProductDetails = async (req, res) => {
  try {
    const { product_id } = req.params;
    const product = await productSyncModel.getProductById(product_id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const skus = await productSyncModel.getProductSkus(product_id);
    const images = productSyncModel.safeJsonParse(product.images_json, []);
    const attributes = productSyncModel.safeJsonParse(product.attributes_json, {});
    const raw = productSyncModel.safeJsonParse(product.raw_json, null);

    return res.status(200).json({
      success: true,
      product: {
        ...product,
        name: product.name || attributes.name || null,
        brand: product.brand || attributes.brand || null,
        description: product.description || attributes.description || null,
        short_description: product.short_description || attributes.short_description || null,
        images,
        attributes,
        raw,
        skus
      }
    });
  } catch (error) {
    console.error("[DARAZ_GET_PRODUCT_DETAILS_FAIL]:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch Daraz product details", error: error.message });
  }
};

exports.getProductByItemId = async (req, res) => {
  try {
    const { account_code, item_id } = req.params;
    const product = await productSyncModel.getProductByItemId(account_code, item_id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const skus = await productSyncModel.getProductSkus(product.id);
    return res.status(200).json({ success: true, product: { ...product, skus } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch product by item_id", error: error.message });
  }
};

exports.getProductSkus = async (req, res) => {
  try {
    const { product_id } = req.params;
    const skus = await productSyncModel.getProductSkus(product_id);
    return res.status(200).json({ success: true, total: skus.length, skus });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch product SKUs", error: error.message });
  }
};

exports.getDashboardSummary = async (req, res) => {
  try {
    const data = await productSyncModel.getDashboardSummary();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch Daraz dashboard summary", error: error.message });
  }
};

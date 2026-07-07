const service = require("../../../services/daraz/inventory/daraz_inventory_sync_service");

function getUserId(req) {
  return req?.user?.id || req?.user?.user_id || req?.auth?.id || null;
}

function getSku(req) {
  return String(
    req?.params?.sku ||
      req?.body?.sku ||
      req?.body?.seller_sku ||
      req?.query?.sku ||
      ""
  ).trim();
}

async function syncSku(req, res) {
  try {
    const sku = getSku(req);
    const quantity = req.body?.quantity ?? req.body?.stock_qty ?? req.query?.quantity;

    if (!sku) {
      return res.status(400).json({ success: false, message: "SKU is required." });
    }

    if (quantity === undefined || quantity === null || quantity === "") {
      return res.status(400).json({ success: false, message: "Quantity is required." });
    }

    const result = await service.pushSkuStockToDaraz({
      sku,
      quantity,
      source: "manual_inventory_button",
      userId: getUserId(req),
    });

    return res.json({
      success: result.failed_count === 0,
      message: result.failed_count
        ? "Daraz stock sync completed with errors."
        : "Daraz stock synced successfully.",
      data: result,
    });
  } catch (error) {
    console.error("[DARAZ_INVENTORY_SYNC_SKU_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      daraz: error?.daraz || null,
    });

    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.daraz?.message || error.message || "Failed to sync Daraz stock.",
      error: error?.daraz || error.message,
    });
  }
}

async function syncAll(req, res) {
  try {
    const result = await service.syncAllLocalInventoryToDaraz({
      source: "manual_inventory_sync_all",
      userId: getUserId(req),
    });

    return res.json({
      success: result.failed_records === 0,
      message: result.failed_records
        ? "Daraz inventory sync finished with errors."
        : "Daraz inventory sync finished successfully.",
      data: result,
    });
  } catch (error) {
    console.error("[DARAZ_INVENTORY_SYNC_ALL_ERROR]", {
      message: error?.message,
      code: error?.code || null,
      daraz: error?.daraz || null,
    });

    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.daraz?.message || error.message || "Failed to sync Daraz inventory.",
      error: error?.daraz || error.message,
    });
  }
}

module.exports = {
  syncSku,
  syncAll,
};

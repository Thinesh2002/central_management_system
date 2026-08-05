const service = require("../../../services/brighthub/inventory/brighthub_inventory_sync_service");

function getUserId(req) {
  return req?.user?.id || req?.user?.user_id || req?.auth?.id || null;
}

function getSku(req) {
  return String(req?.params?.sku || req?.body?.sku || req?.query?.sku || "").trim();
}

async function getStockForSkus(req, res) {
  try {
    const skus = Array.isArray(req.body?.skus) ? req.body.skus : [];

    if (!skus.length) {
      return res.json({ success: true, data: {} });
    }

    const data = await service.getBrightHubStockForSkus(skus);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[BRIGHTHUB_INVENTORY_STOCK_BY_SKUS_ERROR]", error.message);

    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load Website stock.",
    });
  }
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

    const result = await service.pushSkuStockToBrightHub({
      sku,
      quantity,
      source: "manual_inventory_button",
      userId: getUserId(req),
    });

    return res.json({
      success: result.failed_count === 0,
      message: result.failed_count
        ? "Website stock sync completed with errors."
        : "Website stock synced successfully.",
      data: result,
    });
  } catch (error) {
    console.error("[BRIGHTHUB_INVENTORY_SYNC_SKU_ERROR]", error.message);

    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to sync Website stock.",
    });
  }
}

module.exports = {
  getStockForSkus,
  syncSku,
};

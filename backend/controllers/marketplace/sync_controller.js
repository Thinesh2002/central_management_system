const syncService = require("../../services/marketplace/sync_service");

async function manualSync(req, res) {
  try {
    const { accountId } = req.params;
    const { sync_type } = req.body;

    if (!sync_type) {
      return res.status(400).json({
        success: false,
        message: "sync_type is required. Example: products, categories, inventory, price, images",
      });
    }

    const allowedSyncTypes = [
      "products",
      "inventory",
      "price",
      "images",
      "categories",
      "full_sync",
    ];

    if (!allowedSyncTypes.includes(sync_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sync_type.",
        allowed_sync_types: allowedSyncTypes,
      });
    }

    const result = await syncService.manualSyncAccount({
      accountId,
      syncType: sync_type,
      userId: req.user?.id || null,
    });

    return res.json({
      success: true,
      message: "Manual sync completed.",
      data: result,
    });
  } catch (error) {
    console.error("[MANUAL_SYNC_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Manual sync failed.",
    });
  }
}

module.exports = {
  manualSync,
};
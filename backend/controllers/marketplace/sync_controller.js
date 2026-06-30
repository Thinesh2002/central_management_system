const syncService = require("../../services/marketplace/sync_service");

const allowedSyncTypes = [
  "products",
  "inventory",
  "price",
  "images",
  "categories",
  "full_sync",
];

async function manualSync(req, res) {
  try {
    const accountId =
      req.params.accountId ||
      req.params.account_id ||
      req.body?.account_id ||
      req.query?.account_id;

    const syncType = req.body?.sync_type || req.query?.sync_type;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "account_id is required.",
      });
    }

    if (!syncType) {
      return res.status(400).json({
        success: false,
        message:
          "sync_type is required. Example: products, categories, inventory, price, images, full_sync",
        allowed_sync_types: allowedSyncTypes,
      });
    }

    if (!allowedSyncTypes.includes(syncType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sync_type.",
        allowed_sync_types: allowedSyncTypes,
      });
    }

    const result = await syncService.manualSyncAccount({
      accountId,
      syncType,
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
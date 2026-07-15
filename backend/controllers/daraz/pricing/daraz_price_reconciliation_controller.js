const reconciliationService = require("../../../services/daraz/pricing/daraz_price_reconciliation_service");

// Manual "Run Now" trigger - master admin only, matching the app's existing
// ad hoc role-check convention for AI/sync job triggers.
async function run(req, res) {
  try {
    if (req.user?.role !== "master_admin") {
      return res.status(403).json({ success: false, message: "Only a master admin can run this manually." });
    }

    const result = await reconciliationService.reconcileAllLocalPricesToDaraz({
      source: "manual",
      userId: req.user?.id || null,
    });

    return res.json({ success: true, message: "Price reconciliation completed.", data: result });
  } catch (error) {
    console.error("[DARAZ_PRICE_RECONCILIATION_RUN_ERROR]", { message: error?.message });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to run price reconciliation.",
    });
  }
}

module.exports = { run };

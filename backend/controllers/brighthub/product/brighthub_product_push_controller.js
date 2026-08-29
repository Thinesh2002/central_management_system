const brighthubProductPushService = require("../../../services/brighthub/product/brighthub_product_push_service");

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || "Something went wrong.";
}

// Manual "Sync now" trigger - same logic the every-30-minutes job runs, just
// invoked on demand. Only ever creates products that don't already have a
// brighthub_products link, so calling this repeatedly is always safe.
async function pushLocalCatalog(req, res) {
  const accountId = req?.params?.accountId;

  if (!accountId) {
    return res.status(400).json({ success: false, message: "Account ID is required." });
  }

  try {
    const result = await brighthubProductPushService.pushLocalProductsForAccount(accountId, {
      triggered_by_type: "user",
    });

    return res.json({ success: true, message: "Local catalog push to BrightHub completed.", data: result });
  } catch (error) {
    console.error("[PUSH_LOCAL_CATALOG_TO_BRIGHTHUB_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Local catalog push to BrightHub failed.",
      error: getErrorMessage(error),
    });
  }
}

module.exports = { pushLocalCatalog };

const express = require("express");

const brighthubAccountController = require("../../controllers/marketplace/brighthub/brighthub_controller");
const brighthubProductController = require("../../controllers/brighthub/product/brighthub_product_controller");

const router = express.Router();

function requireHandler(handler, name) {
  if (typeof handler !== "function") {
    throw new Error(`[BRIGHTHUB_ROUTE_ERROR]: ${name} is not a function. Check controller export/import path.`);
  }

  return handler;
}

router.post("/connect", requireHandler(brighthubAccountController.connectBrightHubAccount, "connectBrightHubAccount"));

router.get("/accounts", requireHandler(brighthubAccountController.listBrightHubAccounts, "listBrightHubAccounts"));

router.post(
  "/accounts/:accountId/test",
  requireHandler(brighthubAccountController.testBrightHubAccount, "testBrightHubAccount")
);

router.get(
  "/accounts/:accountId/products",
  requireHandler(brighthubAccountController.getBrightHubProducts, "getBrightHubProducts")
);

router.post(
  "/accounts/:accountId/sync-products",
  requireHandler(brighthubProductController.syncBrightHubProducts, "syncBrightHubProducts")
);

router.get(
  "/accounts/:accountId/synced-products",
  requireHandler(brighthubProductController.getSyncedBrightHubProducts, "getSyncedBrightHubProducts")
);

router.get(
  "/accounts/:accountId/synced-products/:bhid",
  requireHandler(brighthubProductController.getSyncedBrightHubProductDetail, "getSyncedBrightHubProductDetail")
);

module.exports = router;

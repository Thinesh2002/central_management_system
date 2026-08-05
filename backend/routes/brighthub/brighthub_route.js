const express = require("express");
const multer = require("multer");

const brighthubAccountController = require("../../controllers/marketplace/brighthub/brighthub_controller");
const brighthubProductController = require("../../controllers/brighthub/product/brighthub_product_controller");
const brighthubOrderController = require("../../controllers/brighthub/order/brighthub_order_controller");
const brighthubInventorySyncController = require("../../controllers/brighthub/inventory/brighthub_inventory_sync_controller");

const router = express.Router();

// In-memory only - the file is forwarded straight to BrightHub's own
// /media/upload API and never written to our own disk. BrightHub's own
// limit is 8MB; capped slightly under here so a too-large upload fails
// fast locally instead of after the round trip.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
    if (!allowed.has(file.mimetype)) {
      const error = new Error("Only JPEG, PNG, WEBP, GIF, or SVG images are allowed.");
      error.statusCode = 400;
      return cb(error);
    }
    return cb(null, true);
  },
});

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

router.get(
  "/accounts/:accountId/products/:bhid/live",
  requireHandler(brighthubProductController.getLiveBrightHubProduct, "getLiveBrightHubProduct")
);

router.post(
  "/accounts/:accountId/products",
  requireHandler(brighthubProductController.createBrightHubProduct, "createBrightHubProduct")
);

router.put(
  "/accounts/:accountId/products/:bhid",
  requireHandler(brighthubProductController.updateBrightHubProduct, "updateBrightHubProduct")
);

router.delete(
  "/accounts/:accountId/products/:bhid",
  requireHandler(brighthubProductController.deleteBrightHubProduct, "deleteBrightHubProduct")
);

router.get(
  "/accounts/:accountId/orders",
  requireHandler(brighthubOrderController.getBrightHubOrders, "getBrightHubOrders")
);

router.get(
  "/accounts/:accountId/orders/:id",
  requireHandler(brighthubOrderController.getBrightHubOrderDetail, "getBrightHubOrderDetail")
);

router.put(
  "/accounts/:accountId/orders/:id/status",
  requireHandler(brighthubOrderController.updateBrightHubOrderStatus, "updateBrightHubOrderStatus")
);

router.post(
  "/accounts/:accountId/media/upload",
  upload.single("file"),
  requireHandler(brighthubProductController.uploadBrightHubMedia, "uploadBrightHubMedia")
);

router.post(
  "/stock-by-skus",
  requireHandler(brighthubInventorySyncController.getStockForSkus, "getStockForSkus")
);

router.post(
  "/sync-sku/:sku",
  requireHandler(brighthubInventorySyncController.syncSku, "syncSku")
);

module.exports = router;

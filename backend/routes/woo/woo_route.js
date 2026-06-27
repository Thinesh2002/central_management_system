const express = require("express");

const wooAccountController = require("../../controllers/marketplace/woo/woo_controller");
const wooProductController = require("../../controllers/woo/product/woo_product_controller");
const { protect } = require("../../middleware/auth");

const router = express.Router();

router.use(protect);

function requireHandler(handler, name) {
  if (typeof handler !== "function") {
    throw new Error(
      `[WOO_ROUTE_ERROR]: ${name} is not a function. Check controller export/import path.`
    );
  }

  return handler;
}

router.post(
  "/connect",
  requireHandler(wooAccountController.connectWooAccount, "connectWooAccount")
);

router.get(
  "/accounts",
  requireHandler(wooAccountController.listWooAccounts, "listWooAccounts")
);

router.post(
  "/accounts/:accountId/test",
  requireHandler(wooAccountController.testWooAccount, "testWooAccount")
);

router.get(
  "/accounts/:accountId/products",
  requireHandler(wooAccountController.getWooProducts, "getWooProducts")
);

router.get(
  "/accounts/:accountId/orders",
  requireHandler(wooAccountController.getWooOrders, "getWooOrders")
);

router.get(
  "/accounts/:accountId/categories",
  requireHandler(wooAccountController.getWooCategories, "getWooCategories")
);

router.post(
  "/accounts/:accountId/sync-products",
  requireHandler(wooProductController.syncWooProducts, "syncWooProducts")
);

router.get(
  "/accounts/:accountId/synced-products",
  requireHandler(
    wooProductController.getSyncedWooProducts,
    "getSyncedWooProducts"
  )
);

router.get(
  "/accounts/:accountId/synced-products/:wooProductId",
  requireHandler(
    wooProductController.getSyncedWooProductDetail,
    "getSyncedWooProductDetail"
  )
);

module.exports = router;

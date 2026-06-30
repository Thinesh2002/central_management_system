const express = require("express");

const accountController = require("../../controllers/marketplace/account_controller");
const syncController = require("../../controllers/marketplace/sync_controller");

const router = express.Router();

router.get("/accounts", accountController.listMarketplaceAccounts);
router.post("/accounts", accountController.createMarketplaceAccount);

router.get(
  "/accounts/:accountId/check-token",
  accountController.checkSingleAccountToken
);

router.post("/tokens/check-all-daraz", accountController.checkAllDarazTokens);

router.post("/accounts/:accountId/manual-sync", syncController.manualSync);

router.get(
  "/accounts/:accountId/daraz/reauth-url",
  accountController.getDarazReauthUrl
);

router.get(
  "/daraz/oauth/callback",
  accountController.handleDarazOAuthCallback
);

router.get(
  "/daraz/tokens/callback",
  accountController.handleDarazOAuthCallback
);

module.exports = router;
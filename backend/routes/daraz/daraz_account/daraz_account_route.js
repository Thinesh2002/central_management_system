const express = require("express");
const router = express.Router();
const controller = require("../../../controllers/daraz/daraz_account/daraz_account");

router.get("/view", controller.getAccounts);
router.get("/", controller.getAccounts);
router.get("/:account_code/auth-url", controller.getAuthUrl);
router.get("/:account_code", controller.getAccountByCode);
router.post("/", controller.createAccount);
router.put("/:account_code", controller.updateAccount);
router.delete("/:account_code", controller.deleteAccount);
router.post("/:account_code/refresh-token", controller.refreshToken);
router.get("/:account_code/auth/callback", controller.createTokenFromCode);

module.exports = router;

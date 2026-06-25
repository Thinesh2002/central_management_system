const express = require("express");

const financeController = require("../../../controllers/daraz/daraz_finance/daraz_finance_controller");

const router = express.Router();

router.get("/check-permission", financeController.checkFinancePermission);

router.get("/payout/status", financeController.getPayoutStatus);

router.get("/transactions", financeController.getTransactionDetails);

router.get("/summary", financeController.getFinanceSummary);

router.get("/orders/:order_no", financeController.getOrderFinanceDetails);

module.exports = router;
const express = require("express");
const controller = require("../../../controllers/daraz/finance_management/daraz_finance_controller");

const router = express.Router();

router.get("/payouts", controller.listPayouts);
router.get("/payouts/summary", controller.getPayoutSummary);
router.get("/transactions", controller.listTransactions);
router.get("/transactions/summary", controller.getTransactionSummary);
router.get("/sync-logs", controller.listSyncLogs);
router.post("/payouts/sync/:accountId", controller.runPayoutSyncNow);
router.post("/transactions/sync/:accountId", controller.runTransactionSyncNow);

module.exports = router;

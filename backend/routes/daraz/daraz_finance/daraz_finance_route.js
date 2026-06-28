const express = require("express");

const financeController = require("../../../controllers/daraz/daraz_finance/daraz_finance_controller");

const router = express.Router();

function handler(...names) {
  for (const name of names) {
    if (typeof financeController[name] === "function") {
      return financeController[name];
    }
  }

  return function missingFinanceHandler(req, res) {
    return res.status(500).json({
      success: false,
      message: `Daraz finance controller handler missing: ${names.join(" or ")}`,
    });
  };
}

const checkFinancePermission = handler(
  "checkFinancePermission",
  "checkPermission"
);

const getPayoutStatus = handler(
  "getPayoutStatus",
  "getPayouts",
  "syncPayoutStatus"
);

const getTransactionDetails = handler(
  "getTransactionDetails",
  "getTransactions",
  "syncTransactions",
  "syncFinanceTransactions"
);

const getAllTransactionDetails = handler(
  "getAllTransactionDetails",
  "getAllTransactions",
  "syncAllTransactions",
  "getTransactionDetails",
  "getTransactions"
);

const getFinanceSummary = handler(
  "getFinanceSummary",
  "getSummary",
  "syncSummary"
);

const getOrderFinanceDetails = handler(
  "getOrderFinanceDetails",
  "getOrderDetails",
  "getOrderFinance"
);

router.get("/check-permission", checkFinancePermission);
router.post("/check-permission", checkFinancePermission);

router.get("/payout/status", getPayoutStatus);
router.post("/payout/status", getPayoutStatus);

router.get("/transactions", getTransactionDetails);
router.post("/transactions", getTransactionDetails);

router.get("/transactions/all", getAllTransactionDetails);
router.post("/transactions/all", getAllTransactionDetails);

router.get("/transactions/sync", getTransactionDetails);
router.post("/transactions/sync", getTransactionDetails);

router.get("/sync/transactions", getTransactionDetails);
router.post("/sync/transactions", getTransactionDetails);

router.get("/summary", getFinanceSummary);
router.post("/summary", getFinanceSummary);

router.get("/summary/sync", getFinanceSummary);
router.post("/summary/sync", getFinanceSummary);

router.get("/sync", getFinanceSummary);
router.post("/sync", getFinanceSummary);

router.get("/orders/:order_no", getOrderFinanceDetails);
router.post("/orders/:order_no", getOrderFinanceDetails);

module.exports = router;
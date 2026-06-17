const express = require("express");
const router = express.Router();

const { createAccessToken } = require("../../controllers/daraz/daraz_controller");
const SyncFinanceController = require("../../controllers/daraz/daraz_finance/sync/daraz_finance_controller");
const FinanceController = require("../../controllers/daraz/daraz_finance/daraz_finance_controllers"); 


/*
--------------------------------------------------
DARAZ TOKEN
--------------------------------------------------
*/
router.get("/token", createAccessToken);

/*
--------------------------------------------------
FINANCE ROUTES
--------------------------------------------------
*/
router.get("/finance/sync", SyncFinanceController.syncFinance);
router.get("/finance/view", FinanceController.viewAllFinanceWithImage);
router.get("/finance/all-with-image", FinanceController.viewAllFinanceWithImage);



module.exports = router;
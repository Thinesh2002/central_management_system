const express = require("express");
const router = express.Router();
const {
    storeIncome,
    getIncomes,
    getIncome,
    updateIncome,
    deleteIncome
} = require("../../controllers/Finance/Finance_controller");


router.post("/add-income", storeIncome);
router.get("/view-income", getIncomes);
router.get("/incomes/:id", getIncome);
router.put("/incomes/:id", updateIncome);
router.delete("/incomes/:id", deleteIncome);

module.exports = router;

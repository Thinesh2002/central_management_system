const express = require("express");
const router = express.Router();
const Trendcontroller = require("../../controllers/sales_trend_analysis/sales_trend_analysis");

router.get("/product-moving-trend", Trendcontroller.getProductTrend);

module.exports = router;

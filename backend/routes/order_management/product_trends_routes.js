const express = require("express");
const router = express.Router();

const productTrendController = require("../../controllers/order_management/product_trend_controller");

router.get("/", productTrendController.getProductTrends);

module.exports = router;

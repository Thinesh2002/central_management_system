const express = require("express");
const controller = require("../../controllers/order_management/sku_report_controller");

const router = express.Router();

router.get("/:sku", controller.getReport);

module.exports = router;

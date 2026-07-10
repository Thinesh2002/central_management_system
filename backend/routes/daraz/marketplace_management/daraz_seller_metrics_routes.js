const express = require("express");
const controller = require("../../../controllers/daraz/marketplace_management/daraz_seller_metrics_controller");

const router = express.Router();

router.get("/:accountId", controller.getMetrics);

module.exports = router;

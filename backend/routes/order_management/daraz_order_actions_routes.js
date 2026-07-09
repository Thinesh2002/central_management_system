const express = require("express");
const controller = require("../../controllers/order_management/daraz_order_action_controller");

const router = express.Router();

router.post("/", controller.runBulkAction);

module.exports = router;

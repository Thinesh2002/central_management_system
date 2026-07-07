const express = require("express");
const router = express.Router();

const darazTransferController = require("../../../controllers/daraz/product_management/daraz_transfer_controller");

router.post("/", darazTransferController.transfer);

module.exports = router;

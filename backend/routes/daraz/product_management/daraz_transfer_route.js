const express = require("express");
const router = express.Router();

const darazTransferController = require("../../../controllers/daraz/product_management/daraz_transfer_controller");

router.post("/", darazTransferController.transfer);
router.post("/ai-fill", darazTransferController.generateContent);
router.post("/clone-account", darazTransferController.cloneAccountProducts);

module.exports = router;

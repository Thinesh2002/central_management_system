const express = require("express");
const router = express.Router();

const darazToDarazTransferController = require("../../../controllers/daraz/transfer/daraz_to_daraz/daraz_to_daraz_transfer_controller");

router.post(
  "/transfer",
  darazToDarazTransferController.transferDarazToDaraz
);

module.exports = router;
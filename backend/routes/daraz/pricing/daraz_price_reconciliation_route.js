const express = require("express");
const router = express.Router();

const { protect } = require("../../../middleware/auth");
const controller = require("../../../controllers/daraz/pricing/daraz_price_reconciliation_controller");

router.post("/run", protect, controller.run);

module.exports = router;

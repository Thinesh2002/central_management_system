const express = require("express");
const controller = require("../../controllers/order_management/order_sync_settings_controller");

const router = express.Router();

router.get("/", controller.getSettings);
router.put("/", controller.updateSettings);
router.post("/run-now", controller.runNow);

module.exports = router;

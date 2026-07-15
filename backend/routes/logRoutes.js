const express = require("express");
const {
  getLogs,
  getLoginLogs,
  getSystemLogs,
  getInventoryLogs,
  getTitleOptimizerLogs,
  getPriceReconciliationLogs,
  getDarazWebhookLogs,
} = require("../controllers/logController");
const { protect } = require("../middleware/auth");
const { requirePermission } = require("../middleware/access");

const router = express.Router();

router.get("/", protect, requirePermission("logs", "view"), getLogs);
router.get("/login", protect, requirePermission("logs", "view"), getLoginLogs);
router.get("/system", protect, requirePermission("logs", "view"), getSystemLogs);
router.get("/inventory", protect, requirePermission("logs", "view"), getInventoryLogs);
router.get("/title-optimizer", protect, requirePermission("logs", "view"), getTitleOptimizerLogs);
router.get("/price-reconciliation", protect, requirePermission("logs", "view"), getPriceReconciliationLogs);
router.get("/daraz-webhooks", protect, requirePermission("logs", "view"), getDarazWebhookLogs);

module.exports = router;

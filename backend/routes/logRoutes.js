const express = require("express");
const { getLogs, getLoginLogs, getSystemLogs, getAuditLogs, getAutomationLogs } = require("../controllers/logController");
const { protect } = require("../middleware/auth");
const { requirePermission } = require("../middleware/access");

const router = express.Router();

router.get("/", protect, requirePermission("logs", "view"), getLogs);
router.get("/login", protect, requirePermission("logs", "view"), getLoginLogs);
router.get("/system", protect, requirePermission("logs", "view"), getSystemLogs);
router.get("/audit", protect, requirePermission("audit_logs", "view"), getAuditLogs);
router.get("/automation", protect, requirePermission("logs", "view"), getAutomationLogs);

module.exports = router;

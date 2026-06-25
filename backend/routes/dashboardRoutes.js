const express = require("express");
const { getDashboard } = require("../controllers/dashboardController");
const { protect } = require("../middleware/auth");
const { requirePermission } = require("../middleware/access");

const router = express.Router();

router.get("/", protect, requirePermission("dashboard", "view"), getDashboard);

module.exports = router;

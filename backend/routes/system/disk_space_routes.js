const express = require("express");
const { getDiskSpace, cleanBinlogs } = require("../../controllers/system/disk_space_controller");
const { protect } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/access");

const router = express.Router();

router.get("/", protect, requirePermission("server_storage", "view"), getDiskSpace);
router.post("/clean-binlogs", protect, requirePermission("server_storage", "edit"), cleanBinlogs);

module.exports = router;

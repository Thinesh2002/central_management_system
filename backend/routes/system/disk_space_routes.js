const express = require("express");
const { getDiskSpace } = require("../../controllers/system/disk_space_controller");
const { protect } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/access");

const router = express.Router();

router.get("/", protect, requirePermission("server_storage", "view"), getDiskSpace);

module.exports = router;

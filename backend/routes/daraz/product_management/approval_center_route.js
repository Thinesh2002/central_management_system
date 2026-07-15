const express = require("express");
const router = express.Router();

const { protect } = require("../../../middleware/auth");
const { requirePermission } = require("../../../middleware/access");
const controller = require("../../../controllers/daraz/product_management/approval_center_controller");

const PAGE_KEY = "approval_center";

router.get("/", protect, requirePermission(PAGE_KEY, "view"), controller.list);
router.post("/:id/approve", protect, requirePermission(PAGE_KEY, "edit"), controller.approve);
router.post("/:id/reject", protect, requirePermission(PAGE_KEY, "edit"), controller.reject);

module.exports = router;

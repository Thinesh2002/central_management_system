const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/access");
const controller = require("../../controllers/supplier_management/grn_controller");

const PAGE_KEY = "grn";

router.get("/", protect, requirePermission(PAGE_KEY, "view"), controller.list);
router.get("/:id", protect, requirePermission(PAGE_KEY, "view"), controller.getById);
router.post("/", protect, requirePermission(PAGE_KEY, "edit"), controller.create);

module.exports = router;

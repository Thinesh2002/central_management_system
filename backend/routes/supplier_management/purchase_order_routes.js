const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/access");
const controller = require("../../controllers/supplier_management/purchase_order_controller");

const PAGE_KEY = "purchase_orders";

router.get("/next-number", protect, requirePermission(PAGE_KEY, "view"), controller.nextNumber);
router.get("/", protect, requirePermission(PAGE_KEY, "view"), controller.list);
router.get("/:id", protect, requirePermission(PAGE_KEY, "view"), controller.getById);
router.post("/", protect, requirePermission(PAGE_KEY, "edit"), controller.create);
router.put("/:id", protect, requirePermission(PAGE_KEY, "edit"), controller.update);
router.put("/:id/status", protect, requirePermission(PAGE_KEY, "edit"), controller.updateStatus);
router.delete("/:id", protect, requirePermission(PAGE_KEY, "delete"), controller.remove);

module.exports = router;

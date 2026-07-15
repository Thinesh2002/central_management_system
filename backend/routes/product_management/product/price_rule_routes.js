const express = require("express");
const router = express.Router();

const { protect } = require("../../../middleware/auth");
const { requirePermission } = require("../../../middleware/access");
const controller = require("../../../controllers/product_management/product/price_rule_controller");

const PAGE_KEY = "price_rules";

router.get("/", protect, requirePermission(PAGE_KEY, "view"), controller.list);
router.get("/:id", protect, requirePermission(PAGE_KEY, "view"), controller.getById);
router.post("/", protect, requirePermission(PAGE_KEY, "edit"), controller.create);
router.put("/:id", protect, requirePermission(PAGE_KEY, "edit"), controller.update);
router.delete("/:id", protect, requirePermission(PAGE_KEY, "delete"), controller.remove);

module.exports = router;

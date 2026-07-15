const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/auth");
const supplierController = require("../../controllers/supplier_management/supplier_controller");

// protect populates req.user so the controller's master_admin check has
// something real to check - without it req.user is always undefined and
// every request would 403, including a real master admin's.
// Registered before "/:id" so "options" isn't swallowed as an id param.
router.get("/options", protect, supplierController.options);
router.get("/", protect, supplierController.list);
router.get("/:id", protect, supplierController.getById);
router.post("/", protect, supplierController.create);
router.put("/:id", protect, supplierController.update);
router.delete("/:id", protect, supplierController.remove);

module.exports = router;

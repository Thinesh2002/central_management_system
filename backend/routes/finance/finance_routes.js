const express = require("express");
const controller = require("../../controllers/finance/finance_controller");
const { protect } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/access");

const router = express.Router();

router.use(protect);

router.get("/access", controller.getAccess);
router.get("/dashboard", requirePermission("finance_dashboard", "view"), controller.getDashboard);

// Categories are only ever picked from inside the ledger, so they share
// the finance_ledger permission rather than having their own page.
router.get("/categories", requirePermission("finance_ledger", "view"), controller.listCategories);
router.post("/categories", requirePermission("finance_ledger", "edit"), controller.createCategory);
router.put("/categories/:id", requirePermission("finance_ledger", "edit"), controller.updateCategory);
router.delete("/categories/:id", requirePermission("finance_ledger", "delete"), controller.deleteCategory);

router.get("/entries", requirePermission("finance_ledger", "view"), controller.listEntries);
router.post("/entries", requirePermission("finance_ledger", "edit"), controller.createEntry);
router.put("/entries/:id", requirePermission("finance_ledger", "edit"), controller.updateEntry);
router.delete("/entries/:id", requirePermission("finance_ledger", "delete"), controller.deleteEntry);

module.exports = router;

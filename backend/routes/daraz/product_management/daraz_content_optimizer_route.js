const express = require("express");
const router = express.Router();

const { protect } = require("../../../middleware/auth");
const contentOptimizerController = require("../../../controllers/daraz/product_management/daraz_content_optimizer_controller");

// protect is required here (unlike its sibling daraz_title_optimizer_route.js,
// which has no auth middleware at all) because /scan's master-admin check
// depends on req.user.role actually being populated - without it req.user
// is always undefined and the check would 403 every request, including a
// real master admin's.
router.post("/scan", protect, contentOptimizerController.scan);
router.get("/suggestions", protect, contentOptimizerController.listSuggestions);
router.get("/suggestions/:id", protect, contentOptimizerController.getSuggestion);
router.post("/suggestions/:id/apply-description", protect, contentOptimizerController.applyDescription);
router.post("/suggestions/:id/reject", protect, contentOptimizerController.reject);

module.exports = router;

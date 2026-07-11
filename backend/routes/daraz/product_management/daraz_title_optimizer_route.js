const express = require("express");
const router = express.Router();

const titleOptimizerController = require("../../../controllers/daraz/product_management/daraz_title_optimizer_controller");

router.post("/scan", titleOptimizerController.scan);
router.get("/suggestions", titleOptimizerController.listSuggestions);
router.post("/suggestions/:id/approve", titleOptimizerController.approveSuggestion);
router.post("/suggestions/:id/reject", titleOptimizerController.rejectSuggestion);
router.get("/logs/:id/impact", titleOptimizerController.getTitleChangeImpact);

module.exports = router;

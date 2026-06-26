const express = require("express");
const productColourController = require("../../../controllers/product_management/product_colour/product_colour_controller");
const { protect } = require("../../../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", productColourController.listColours);
router.get("/:id", productColourController.getColour);
router.post("/", productColourController.createColour);
router.put("/:id", productColourController.updateColour);
router.delete("/:id", productColourController.deleteColour);
router.patch("/:id/restore", productColourController.restoreColour);
router.delete("/:id/force", productColourController.forceDeleteColour);

module.exports = router;

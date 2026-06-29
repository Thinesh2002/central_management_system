const express = require("express");
const router = express.Router();

const productColourController = require("../../../controllers/product_management/product_colour/product_colour_controller");

router.get("/", productColourController.listColours);
router.get("/:id", productColourController.getColour);

router.post("/", productColourController.createColour);
router.put("/:id", productColourController.updateColour);

router.delete("/:id", productColourController.deleteColour);
router.patch("/:id/restore", productColourController.restoreColour);
router.delete("/:id/force", productColourController.forceDeleteColour);

module.exports = router;
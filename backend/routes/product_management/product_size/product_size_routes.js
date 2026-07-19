const express = require("express");
const router = express.Router();

const productSizeController = require("../../../controllers/product_management/product_size/product_size_controller");

router.get("/", productSizeController.listSizes);
router.get("/:id", productSizeController.getSize);

router.post("/", productSizeController.createSize);
router.put("/:id", productSizeController.updateSize);

router.delete("/:id", productSizeController.deleteSize);
router.patch("/:id/restore", productSizeController.restoreSize);
router.delete("/:id/force", productSizeController.forceDeleteSize);

module.exports = router;

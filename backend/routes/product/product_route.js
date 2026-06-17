const express = require("express");
const router = express.Router();

const productController = require("../../controllers/product/product_controller");

router.post("/add", productController.createProduct);
router.get("/", productController.getAllProducts);
router.get("/:parentSku", productController.getProductBySku);
router.get("/:parentSku/variations", productController.getVariationsByProduct);
router.put("/:parentSku", productController.updateProduct);
router.delete("/:parentSku", productController.deleteProduct);

module.exports = router;
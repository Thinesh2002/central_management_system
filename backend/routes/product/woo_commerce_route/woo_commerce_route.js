const express = require("express");
const router = express.Router();

const {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getVariations,
  updateVariationsBatch,
  createVariation,
  deleteVariation
} = require("../../../controllers/product/woo_commerce/woo_product_controller");
/* ================= ROUTES ================= */

router.get("/all", getAllProducts);
router.get("/:id", getProduct);
router.post("/create", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.post("/:id/variations", createVariation);
router.get("/:id/variations", getVariations); 
router.put("/:id/variations-batch", updateVariationsBatch); 
router.delete("/:id/variations/:varId", deleteVariation);
module.exports = router;
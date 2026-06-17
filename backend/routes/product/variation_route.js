const express = require("express");
const router = express.Router();

const {
  createVariation,
  getAllVariations,
  getVariationBySku,
  deleteVariation
} = require("../../controllers/product/product_variation_controller");

/* ================= CREATE ================= */
router.post("/", createVariation);

/* ================= READ ================= */
router.get("/", getAllVariations);
router.get("/:sku", getVariationBySku);

/* ================= DELETE ================= */
router.delete("/:sku", deleteVariation);

module.exports = router;
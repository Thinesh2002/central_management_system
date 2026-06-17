const express = require("express");
const router = express.Router();

const {
  createCategory,
  getAllCategories,
  getCategoryByCode,
  updateCategory,
  deleteCategory,
} = require("../../controllers/product/category_controller");

/* ================= CREATE ================= */
router.post("/", createCategory);

/* ================= READ ================= */
router.get("/", getAllCategories);
router.get("/:categoryCode", getCategoryByCode);

/* ================= UPDATE ================= */
router.put("/:categoryCode", updateCategory);

/* ================= DELETE ================= */
router.delete("/:categoryCode", deleteCategory);

module.exports = router;
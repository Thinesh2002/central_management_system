const express = require("express");
const router = express.Router();

const {
  createSubCategory,
  getAllSubCategories,
  getSubByCategory,
  updateSubCategory,
  deleteSubCategory
} = require("../../controllers/product/sub_category_controller");

/* CREATE */
router.post("/", createSubCategory);

/* VIEW ALL */
router.get("/", getAllSubCategories);

/* VIEW BY CATEGORY */
router.get("/category/:categoryCode", getSubByCategory);

/* UPDATE */
router.put("/:subCategoryCode", updateSubCategory);

/* DELETE */
router.delete("/:subCategoryCode", deleteSubCategory);

module.exports = router;
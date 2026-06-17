const express = require("express");
const router = express.Router();
const categoryController = require("../../../controllers/daraz/daraz_category/daraz_category_controller");

router.post("/categories/sync-tree", categoryController.syncCategoryTree);
router.get("/categories", categoryController.getCategoryTree);
router.get("/category-attributes", categoryController.getCategoryAttributes);
router.post("/category-attributes/:category_id/sync", categoryController.syncCategoryAttributes);
router.get("/category-brands", categoryController.getCategoryBrands);
router.post("/category-brands/:category_id/sync", categoryController.syncCategoryBrands);

module.exports = router;

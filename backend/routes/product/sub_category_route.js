const express = require("express");
const router = express.Router();
const enterprise = require("../../controllers/system/enterprise_cms_controller");

router.get("/", enterprise.categories);
router.post("/", enterprise.saveSubCategory);
router.post("/add", enterprise.saveSubCategory);
router.put("/:subCategoryCode", enterprise.saveSubCategory);
router.delete("/:code", enterprise.deleteSubCategory);

module.exports = router;

const express = require("express");
const router = express.Router();
const enterprise = require("../../controllers/system/enterprise_cms_controller");

router.get("/", enterprise.categories);
router.post("/", enterprise.saveCategory);
router.post("/add", enterprise.saveCategory);
router.put("/:categoryCode", enterprise.saveCategory);
router.delete("/:code", enterprise.deleteCategory);

module.exports = router;

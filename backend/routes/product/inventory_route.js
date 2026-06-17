const express = require("express");
const router = express.Router();
const enterprise = require("../../controllers/system/enterprise_cms_controller");

router.get("/", enterprise.products);
router.get("/view", enterprise.products);
router.post("/", enterprise.updateStock);
router.post("/update-stock", enterprise.updateStock);
router.put("/:sku", (req, res) => {
  req.body.sku = req.params.sku;
  return enterprise.updateStock(req, res);
});
router.get("/:sku", (req, res) => {
  req.query.search = req.params.sku;
  req.query.limit = 1;
  return enterprise.products(req, res);
});

module.exports = router;

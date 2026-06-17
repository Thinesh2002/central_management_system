const express = require("express");
const router = express.Router();
const enterprise = require("../../controllers/system/enterprise_cms_controller");

router.get("/list", enterprise.products);
router.get("/", enterprise.products);
router.post("/add", enterprise.saveProduct);
router.post("/", enterprise.saveProduct);
router.get("/generate-sku", enterprise.generateSku);
router.put("/:sku", enterprise.updateProduct);
router.post("/:sku/deactivate", enterprise.deactivateProduct);
router.delete("/:sku", enterprise.deleteProduct);
router.get("/:sku", async (req, res) => {
  req.query.search = req.params.sku;
  req.query.limit = 1;
  return enterprise.products(req, res);
});
router.get("/:sku/variations", async (req, res) => {
  req.query.search = req.params.sku;
  return enterprise.products(req, res);
});

module.exports = router;

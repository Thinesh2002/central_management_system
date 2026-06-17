const express = require("express");
const router = express.Router();
const controller = require("../../controllers/system/unified_inventory_controller");

router.post("/bootstrap", controller.bootstrap);
router.get("/dashboard", controller.dashboard);
router.get("/products", controller.products);
router.post("/products", controller.addProduct);
router.get("/categories", controller.categories);
router.put("/stock", controller.updateStock);
router.post("/stock", controller.updateStock);
router.get("/sku-mapping", controller.getSkuMappings);
router.post("/sku-mapping", controller.saveSkuMapping);
router.get("/pack-rules", controller.getPackRules);
router.post("/pack-rules", controller.savePackRule);
router.get("/logs", controller.logs);

module.exports = router;

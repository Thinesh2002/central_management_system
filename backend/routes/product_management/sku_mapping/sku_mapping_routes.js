const express = require("express");
const router = express.Router();

const skuMappingController = require("../../../controllers/product_management/sku_mapping/sku_mapping_controller");

router.get("/", skuMappingController.listMappings);
router.get("/:id", skuMappingController.getMapping);

router.post("/", skuMappingController.createMapping);
router.put("/:id", skuMappingController.updateMapping);

router.delete("/:id", skuMappingController.deleteMapping);

module.exports = router;

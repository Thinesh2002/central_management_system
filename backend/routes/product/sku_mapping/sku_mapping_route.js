const express = require("express");
const router = express.Router();
const controller = require("../../../controllers/product/sku_mapping/sku_maping_controller");

router.post("/create", controller.saveMapping);
router.get("/view", controller.getMappings);
router.delete("/delete", controller.deleteMapping);


module.exports = router;

const express = require("express");
const controller = require("../../../controllers/product_management/product/product_inventory_controller");

const { protect } = require("../../../middleware/auth");

const router = express.Router();
router.use(protect);

router.get("/", controller.list);
router.post("/", controller.create);

router.get("/sku/:sku", controller.getBySku);
router.put("/sku/:sku", controller.updateBySku);
router.patch("/sku/:sku", controller.patchBySku);
router.delete("/sku/:sku", controller.removeBySku);

module.exports = router;
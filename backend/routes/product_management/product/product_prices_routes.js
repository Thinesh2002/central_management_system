const express = require("express");
const controller = require("../../../controllers/product_management/product/product_price_controller");

const router = express.Router();

router.get("/", controller.list);
router.post("/", controller.create);

// SKU routes must be before /:id
router.get("/sku/:sku", controller.getBySku);
router.put("/sku/:sku", controller.updateBySku);
router.patch("/sku/:sku", controller.patchBySku);
router.delete("/sku/:sku", controller.removeBySku);

// ID routes
router.get("/:id", controller.getById);
router.put("/:id", controller.update);
router.patch("/:id", controller.patch);
router.delete("/:id", controller.remove);

module.exports = router;
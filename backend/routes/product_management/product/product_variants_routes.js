const express = require("express");
const controller = require("../../../controllers/product_management/product/product_variant_controller");

const router = express.Router();

router.get("/order-picker", controller.listForOrderPicker);

router.get("/", controller.list);
router.get("/:id", controller.getById);

router.post("/", controller.create);

router.put("/:id", controller.update);
router.patch("/:id", controller.patch);

router.delete("/:id", controller.remove);

module.exports = router;
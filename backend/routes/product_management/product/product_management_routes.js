const express = require("express");

const { protect } = require("../../../middleware/auth");

const router = express.Router();
router.use(protect);

router.use("/products", require("./products_routes"));
router.use("/product-variants", require("./product_variants_routes"));
router.use("/product-inventory", require("./product_inventory_routes"));
router.use("/product-prices", require("./product_prices_routes"));
router.use("/product-images", require("./product_images_routes"));
router.use("/product-attribute-values", require("./product_attribute_values_routes"));
router.use("/product-logs", require("./product_logs_routes"));
router.use("/product-image-logs", require("./product_image_logs_routes"));

module.exports = router;

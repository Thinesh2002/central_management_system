const express = require("express");

const router = express.Router();

router.use("/categories", require("./category/category_route"));
router.use("/sub-categories", require("./category/sub_category_route"));
router.use("/attributes", require("./attribute/attribute_route"));
router.use("/attribute-values", require("./attribute/attributeValue_route"));
router.use("/product-variants", require("./product/product_variant_route"));
router.use("/product-attribute-values", require("./product/product_attribute_value_route"));
router.use("/product-images", require("./product/product_image_route"));
router.use("/product-prices", require("./product/product_price_route"));
router.use("/product-inventory", require("./product/product_inventory_route"));
router.use("/product-logs", require("./logs/product_log_route"));
router.use("/product-image-logs", require("./logs/product_image_log"));

module.exports = router;
const express = require("express");
const productImageController = require("../../../controllers/product_management/product/product_image_controller");
const {
  uploadSingleProductImage,
  validateImageMegapixels,
} = require("../../../middleware/product_image_upload_middleware");

const router = express.Router();

router.get("/", productImageController.list);

router.get("/:id", productImageController.getById);

router.post(
  "/",
  uploadSingleProductImage,
  validateImageMegapixels,
  productImageController.create
);

router.put(
  "/:id",
  uploadSingleProductImage,
  validateImageMegapixels,
  productImageController.update
);

router.patch(
  "/:id",
  uploadSingleProductImage,
  validateImageMegapixels,
  productImageController.patch
);

router.patch("/:id/rename", productImageController.rename);

router.delete("/:id", productImageController.remove);

module.exports = router;
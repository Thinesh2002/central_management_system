const express = require("express");
const router = express.Router();

const upload = require("../../middleware/images/product images/upload_product_image");

const {
  uploadImage,
  getImagesBySku,
  deleteMainImage,
  deleteSubImage
} = require("../../controllers/product//product_image_controller");

/* ================= UPLOAD ================= */
// Use upload.single first, then moveToSkuFolder to handle the file move
router.post("/upload", upload.single("image"), upload.moveToSkuFolder, uploadImage);

/* ================= READ ================= */
router.get("/sku/:sku", getImagesBySku);

/* ================= DELETE ================= */
router.delete("/main/:sku", deleteMainImage);
router.delete("/sub/:sku/:slot", deleteSubImage);

module.exports = router;
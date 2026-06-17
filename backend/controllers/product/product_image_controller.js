const ProductImage = require("../../models/product/product_image_model");
const path = require("path");
const fs = require("fs");

const BASE_DIR = path.join(__dirname, "..", "..", "images", "productimage");

/* ================= RESPONSE ================= */
const success = (res, data = {}, message = "Success", status = 200) =>
  res.status(status).json({ success: true, message, ...data });

const error = (res, message = "Error", status = 500) =>
  res.status(status).json({ success: false, message });

/* ================= SAFE DELETE ================= */
const removeFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("FILE DELETE ERROR:", err.message);
  }
};

/* ================= BUILD FILE PATH ================= */
const getFilePath = (sku, filename) => {
  return path.join(BASE_DIR, sku, filename);
};

/* ================= UPLOAD IMAGE ================= */
const uploadImage = async (req, res) => {
  try {
    let { sku, type, slot } = req.body;

    sku = sku?.trim();

    if (!sku) {
      if (req.file) removeFile(req.file.path);
      return error(res, "SKU is required", 400);
    }

    if (!req.file) return error(res, "Image file is required", 400);

    if (!["main", "sub"].includes(type)) {
      removeFile(req.file.path);
      return error(res, "Type must be main or sub", 400);
    }

    const filename = req.file.filename;

    const updateData = {};

    if (type === "main") {
      updateData.main_image = filename;
    }

    if (type === "sub") {
      const slotNum = Number(slot);

      if (!slotNum || slotNum < 1 || slotNum > 9) {
        removeFile(req.file.path);
        return error(res, "Slot must be 1-9", 400);
      }

      updateData[`sub_image${slotNum}`] = filename;
    }

    await ProductImage.update(sku, updateData);

    return success(res, {
      data: {
        sku,
        ...updateData
      }
    }, "Image uploaded", 201);

  } catch (err) {
    console.error("UPLOAD IMAGE ERROR:", err.message);

    if (req.file) removeFile(req.file.path);

    return error(res, "Upload failed");
  }
};

/* ================= GET IMAGES ================= */
const getImagesBySku = async (req, res) => {
  try {
    const { sku } = req.params;

    if (!sku) return error(res, "SKU is required", 400);

    const images = await ProductImage.getBySku(sku);

    if (!images) return error(res, "No images found", 404);

    return success(res, { data: images });

  } catch (err) {
    console.error("GET IMAGES ERROR:", err.message);
    return error(res, "Failed to fetch images");
  }
};

/* ================= DELETE MAIN ================= */
const deleteMainImage = async (req, res) => {
  try {
    const { sku } = req.params;

    const image = await ProductImage.getBySku(sku);

    if (!image?.main_image)
      return error(res, "Main image not found", 404);

    const filePath = getFilePath(sku, image.main_image);

    removeFile(filePath);

    await ProductImage.update(sku, { main_image: null });

    return success(res, {}, "Main image deleted");

  } catch (err) {
    console.error("DELETE MAIN ERROR:", err.message);
    return error(res, "Failed to delete image");
  }
};

/* ================= DELETE SUB ================= */
const deleteSubImage = async (req, res) => {
  try {
    const { sku, slot } = req.params;

    const slotNum = Number(slot);

    if (!slotNum || slotNum < 1 || slotNum > 9)
      return error(res, "Invalid slot", 400);

    const image = await ProductImage.getBySku(sku);

    const column = `sub_image${slotNum}`;

    if (!image?.[column])
      return error(res, "Image not found", 404);

    const filePath = getFilePath(sku, image[column]);

    removeFile(filePath);

    await ProductImage.update(sku, { [column]: null });

    return success(res, {}, `Sub image ${slotNum} deleted`);

  } catch (err) {
    console.error("DELETE SUB ERROR:", err.message);
    return error(res, "Failed to delete image");
  }
};

module.exports = {
  uploadImage,
  getImagesBySku,
  deleteMainImage,
  deleteSubImage
};
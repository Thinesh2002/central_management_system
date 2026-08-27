const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");

const imageSizePackage = require("image-size");

const imageSize =
  imageSizePackage.imageSize ||
  imageSizePackage.default ||
  imageSizePackage;

const MAX_MEGAPIXELS = 10;
const MAX_PIXELS = MAX_MEGAPIXELS * 1000 * 1000;

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const uploadDir = path.join(process.cwd(), "uploads", "product-images");
fs.mkdirSync(uploadDir, { recursive: true });

function safeFileName(name = "product-image") {
  return (
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "product-image"
  );
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = safeFileName(
      path.basename(file.originalname || "product-image", ext)
    );

    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const error = new Error(
      "Only JPG, JPEG, PNG, GIF, and WEBP product images are allowed."
    );
    error.statusCode = 400;
    return cb(error);
  }

  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
});

function readImageDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  return imageSize(buffer);
}

const WEBP_QUALITY = 82;

// Every product image (Local Products, Variants, Images Dashboard - all
// three go through this one shared upload path) is converted to WebP on
// upload, regardless of what format was submitted. Runs after dimension
// validation so an oversized image is rejected before spending time
// re-encoding it.
async function convertToWebp(req) {
  const originalPath = req.file.path;
  const originalExt = path.extname(req.file.filename);
  const baseName = path.basename(req.file.filename, originalExt);
  const webpFilename = `${baseName}.webp`;
  const webpPath = path.join(uploadDir, webpFilename);
  const tempPath = `${webpPath}.tmp`;

  await sharp(originalPath).webp({ quality: WEBP_QUALITY }).toFile(tempPath);
  fs.renameSync(tempPath, webpPath);

  if (originalPath !== webpPath) {
    fs.unlink(originalPath, () => {});
  }

  const stat = fs.statSync(webpPath);

  req.file.filename = webpFilename;
  req.file.path = webpPath;
  req.file.mimetype = "image/webp";
  req.file.size = stat.size;

  return { file_name: webpFilename, image_path: `/uploads/product-images/${webpFilename}`, size_bytes: stat.size };
}

async function validateImageMegapixels(req, res, next) {
  if (!req.file) return next();

  try {
    if (typeof imageSize !== "function") {
      throw new Error(
        "image-size package import failed. Please reinstall image-size."
      );
    }

    const dimensions = readImageDimensions(req.file.path);

    const width = Number(dimensions.width || 0);
    const height = Number(dimensions.height || 0);
    const pixels = width * height;

    if (!width || !height) {
      fs.unlink(req.file.path, () => {});
      const error = new Error("Invalid product image file.");
      error.statusCode = 400;
      return next(error);
    }

    if (pixels > MAX_PIXELS) {
      fs.unlink(req.file.path, () => {});
      const error = new Error(
        `Product image maximum size is ${MAX_MEGAPIXELS}MP. Uploaded image is ${(pixels / 1000000).toFixed(2)}MP.`
      );
      error.statusCode = 400;
      return next(error);
    }

    const webp = await convertToWebp(req);

    req.productImageMeta = {
      width,
      height,
      pixels,
      megapixels: Number((pixels / 1000000).toFixed(2)),
      file_name: webp.file_name,
      original_name: req.file.originalname,
      mime_type: "image/webp",
      size_bytes: webp.size_bytes,
      image_path: webp.image_path,
    };

    return next();
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    error.statusCode = error.statusCode || 400;
    return next(error);
  }
}

const uploadSingleProductImage = upload.single("image");

module.exports = {
  uploadSingleProductImage,

  // aliases for different route import names
  uploadProductImage: uploadSingleProductImage,
  productImageUpload: uploadSingleProductImage,

  validateImageMegapixels,
  validateProductImage: validateImageMegapixels,

  MAX_MEGAPIXELS,
  MAX_PIXELS,

  uploadDir,
  safeFileName,
};
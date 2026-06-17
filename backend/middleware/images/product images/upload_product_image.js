const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const baseUploadDir = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "images",
  "productimage"
);

if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

const tempDir = path.join(baseUploadDir, "_temp");

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      ext;

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];

  const allowedMime = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const ext = path
    .extname(file.originalname)
    .toLowerCase();

  const mime = file.mimetype;

  if (
    allowedExt.includes(ext) &&
    allowedMime.includes(mime)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, JPEG, PNG, and WEBP images are allowed"
      )
    );
  }
};

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter,
});

const moveToSkuFolder = async (
  req,
  res,
  next
) => {
  try {
    if (!req.file) {
      return next();
    }

    const sku = (
      req.body.sku ||
      req.params.sku ||
      ""
    ).trim();

    if (!sku) {
      fs.unlink(req.file.path, () => {});

      return res.status(400).json({
        success: false,
        message:
          "SKU is required for image upload",
      });
    }

    const safeSku = sku.replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    );

    const skuDir = path.join(
      baseUploadDir,
      safeSku
    );

    const thumbDir = path.join(
      skuDir,
      "thumbs"
    );

    if (!fs.existsSync(skuDir)) {
      fs.mkdirSync(skuDir, {
        recursive: true,
      });
    }

    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, {
        recursive: true,
      });
    }

    const newPath = path.join(
      skuDir,
      req.file.filename
    );

    fs.renameSync(req.file.path, newPath);

    const thumbPath = path.join(
      thumbDir,
      req.file.filename
    );

    await sharp(newPath)
      .resize(120, 120, {
        fit: "cover",
      })
      .webp({
        quality: 70,
      })
      .toFile(
        thumbPath.replace(
          path.extname(thumbPath),
          ".webp"
        )
      );

    req.file.path = newPath;
    req.file.destination = skuDir;

    req.file.thumbnail =
      req.file.filename.replace(
        path.extname(req.file.filename),
        ".webp"
      );

    next();
  } catch (error) {
    console.error(
      "Image move error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to process image upload",
    });
  }
};

module.exports = upload;
module.exports.moveToSkuFolder =
  moveToSkuFolder;
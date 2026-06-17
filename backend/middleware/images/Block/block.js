const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ===== Upload Folder ===== */
const uploadDir = path.join(__dirname, "../../../images/block");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ===== Storage ===== */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, ""));
  },
});

/* ===== THIS IS CRITICAL ===== */
const upload = multer({ storage });

/* ===== EXPORT ONLY THIS ===== */
module.exports = upload;

const express = require("express");
const multer = require("multer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });

const darazCatalogController = require("../../controllers/marketplace/daraz_catalog_controller");

router.get("/category-tree/:accountId", darazCatalogController.categoryTree);
router.get("/category-attributes/:accountId", darazCatalogController.categoryAttributes);
router.get("/brands/:accountId", darazCatalogController.brands);
router.get("/qc-status/:accountId", darazCatalogController.qcStatus);
router.post("/product/:accountId", darazCatalogController.createProduct);
router.post("/image/migrate/:accountId", darazCatalogController.migrateImage);
router.post("/image/migrate-batch/:accountId", darazCatalogController.migrateImages);
router.get("/image/migrate-result/:accountId", darazCatalogController.imageMigrationResult);
router.post("/image/set/:accountId", darazCatalogController.setImages);
router.post("/image/upload/:accountId", upload.single("image"), darazCatalogController.uploadImage);

module.exports = router;

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/system/system_settings_controller");

router.get("/features", controller.features);
router.get("/bookmarks", controller.bookmarks);
router.post("/bookmarks", controller.saveBookmark);
router.delete("/bookmarks", controller.removeBookmark);
router.get("/permissions", controller.permissions);
router.post("/permissions", controller.savePermission);

module.exports = router;

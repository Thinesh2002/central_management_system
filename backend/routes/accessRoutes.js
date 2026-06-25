const express = require("express");
const {
  myMenu,
  pages,
  allPages,
  pageByPath,
  createPage,
  updatePage,
  deletePage,
  userPermissions,
  updateUserPermissions,
  syncPermissions,
} = require("../controllers/accessController");
const { protect } = require("../middleware/auth");
const { requirePermission } = require("../middleware/access");

const router = express.Router();

router.get("/my-menu", protect, myMenu);
router.get("/pages", protect, requirePermission("access_control", "view"), pages);
router.get("/pages/all", protect, requirePermission("access_control", "view"), allPages);
router.get("/page-by-path", protect, pageByPath);
router.post("/pages", protect, requirePermission("access_control", "edit"), createPage);
router.put("/pages/:pageId", protect, requirePermission("access_control", "edit"), updatePage);
router.delete("/pages/:pageId", protect, requirePermission("access_control", "delete"), deletePage);
router.post("/sync", protect, syncPermissions);
router.get("/users/:userId", protect, requirePermission("access_control", "view"), userPermissions);
router.put("/users/:userId", protect, requirePermission("access_control", "edit"), updateUserPermissions);

module.exports = router;

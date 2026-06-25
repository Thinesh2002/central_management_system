const express = require("express");
const { getUsers, createUser, updateUser, deleteUser } = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { requirePermission } = require("../middleware/access");

const router = express.Router();

router.get("/", protect, requirePermission("users", "view"), getUsers);
router.post("/", protect, requirePermission("users", "edit"), createUser);
router.put("/:id", protect, requirePermission("users", "edit"), updateUser);
router.delete("/:id", protect, requirePermission("users", "delete"), deleteUser);

module.exports = router;

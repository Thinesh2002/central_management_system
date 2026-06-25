const express = require("express");
const { login, me, logout } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/login", login);
router.get("/me", protect, me);
router.post("/logout", protect, logout);

module.exports = router;

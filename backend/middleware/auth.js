const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

const ROLE_LEVEL = {
  user: 1,
  admin: 2,
  master_admin: 3,
  super_admin: 3,
};

function normalizeRole(role) {
  return String(role || 'user').toLowerCase().replace(/[\s-]+/g, '_');
}

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Please login first." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "change_this_secret_key");
    const user = await userModel.findById(decoded.id);

    if (!user || user.status !== "active") {
      return res.status(401).json({ success: false, message: "Your account is inactive or not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Login expired. Please login again." });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Please login first." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You do not have permission for this action." });
    }

    next();
  };
}

function canManageRole(actorRole, targetRole) {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (actor === "master_admin" || actor === "super_admin") return true;
  if (actor === "admin") return target === "user";
  return false;
}

module.exports = { protect, allowRoles, canManageRole, ROLE_LEVEL };

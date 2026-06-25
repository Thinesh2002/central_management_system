const accessModel = require("../models/accessModel");

function requirePermission(pageKey, action = "view") {
  return async (req, res, next) => {
    try {
      const allowed = await accessModel.hasPermission(req.user, pageKey, action);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You do not have ${action} access for ${pageKey.replace(/_/g, " ")}.`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { requirePermission };

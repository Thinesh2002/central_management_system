function notFound(req, res) {
  return res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(error, req, res, next) {
  console.error("[API_ERROR]", error);

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message: "Duplicate value already exists. Please use different data.",
    });
  }

  if (error.code === "ER_NO_SUCH_TABLE") {
    return res.status(500).json({
      success: false,
      message: "Database table missing. Please import backend/database/cm_auth_management.sql again.",
    });
  }

  if (error.code === "ER_BAD_FIELD_ERROR") {
    return res.status(500).json({
      success: false,
      message: "Database column mismatch. Please use the corrected cm_auth_management.sql file.",
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server error. Please try again.",
  });
}

module.exports = { notFound, errorHandler };

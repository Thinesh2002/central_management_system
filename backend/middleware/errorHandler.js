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
      message: "Database table missing. Please run 'npm run setup-db' in backend/ to create the required tables.",
    });
  }

  if (error.code === "ER_BAD_FIELD_ERROR") {
    return res.status(500).json({
      success: false,
      message: "Database column mismatch. Please run 'npm run setup-db' in backend/ to refresh the schema.",
    });
  }

  if (error.code === "ECONNREFUSED" || error.code === "PROTOCOL_CONNECTION_LOST") {
    return res.status(503).json({
      success: false,
      message: "Cannot connect to the database. Please check that MySQL is running and .env DB settings are correct.",
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server error. Please try again.",
  });
}

module.exports = { notFound, errorHandler };

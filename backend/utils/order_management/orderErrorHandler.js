function orderErrorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const statusCode = error.statusCode || error.status || 500;

  console.error("[ORDER_API_ERROR]", {
    message: error.message,
    code: error.code,
    sqlMessage: error.sqlMessage,
    path: req.originalUrl,
    method: req.method,
  });

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
    error: process.env.NODE_ENV === "production" ? undefined : {
      code: error.code,
      sqlMessage: error.sqlMessage,
    },
  });
}

module.exports = orderErrorHandler;

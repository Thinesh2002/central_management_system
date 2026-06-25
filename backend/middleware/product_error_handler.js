function productErrorHandler(error, req, res, next) {
  const statusCode = Number(error.statusCode || error.status || 500);

  if (statusCode >= 500) {
    console.error("[PRODUCT_MANAGEMENT_ERROR]", {
      message: error.message,
      stack: error.stack,
      path: req.originalUrl,
      method: req.method,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Product management request failed",
    error_code: error.code || null,
  });
}

module.exports = productErrorHandler;

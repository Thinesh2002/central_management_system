const asyncHandler = require("../../middleware/async_handler");
const productTrendModel = require("../../models/order_management/product_trend_model");

const getProductTrends = asyncHandler(async (req, res) => {
  const rows = await productTrendModel.getProductTrends();

  return res.json({
    success: true,
    message: "Product trends loaded successfully.",
    data: rows,
  });
});

module.exports = { getProductTrends };

const salesTrendModel = require("../../models/sales_trend_analysis/sales_trend_analysis");

exports.getProductTrend = async (req, res) => {
  try {

    const data = await salesTrendModel.getProductTrend();

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};

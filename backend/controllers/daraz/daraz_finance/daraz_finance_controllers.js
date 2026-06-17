const FinanceModel = require("../../../models/finance/daraz/daraz_finance_model");

const viewAllFinanceWithImage = async (req, res) => {
  try {
    const data = await FinanceModel.getAllFinanceWithImage();

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    console.error("Finance Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  viewAllFinanceWithImage
}
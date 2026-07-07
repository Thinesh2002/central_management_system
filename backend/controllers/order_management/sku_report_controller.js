const asyncHandler = require("../../middleware/async_handler");
const skuReportModel = require("../../models/order_management/sku_report_model");

const getReport = asyncHandler(async (req, res) => {
  const sku = String(req.params.sku || "").trim();

  if (!sku) {
    return res.status(400).json({ success: false, message: "SKU is required." });
  }

  const report = await skuReportModel.getSkuReport(sku);

  return res.json({ success: true, message: "SKU report loaded", data: report });
});

module.exports = { getReport };

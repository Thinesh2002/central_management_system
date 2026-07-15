const grnModel = require("../../models/supplier_management/grn_model");
const grnStockService = require("../../services/supplier_management/grn_stock_service");

async function list(req, res) {
  try {
    const { purchase_order_id, supplier_id, search, limit, offset } = req.query || {};
    const data = await grnModel.list({ purchase_order_id, supplier_id, search, limit, offset });

    return res.json({ success: true, data: data.rows, total: data.total });
  } catch (error) {
    console.error("[GRN_LIST_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to load goods received notes." });
  }
}

async function getById(req, res) {
  try {
    const grn = await grnModel.findById(req.params.id);

    if (!grn) {
      return res.status(404).json({ success: false, message: "Goods received note not found." });
    }

    return res.json({ success: true, data: grn });
  } catch (error) {
    console.error("[GRN_GET_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to load goods received note." });
  }
}

async function create(req, res) {
  try {
    const { grn, items, purchase_order_status } = await grnModel.createReceipt({
      ...req.body,
      created_by: req.user?.id || null,
    });

    const stockResults = await grnStockService.increaseStockForReceipt({
      grnNumber: grn.grn_number,
      items,
      changedBy: req.user?.id || null,
    });
    const failures = stockResults.filter((r) => r.status !== "success");

    return res.status(201).json({
      success: true,
      message: failures.length
        ? "Goods received note created, but some SKUs' stock could not be updated - check inventory logs."
        : "Goods received note created and stock updated.",
      data: { ...grn, purchase_order_status },
      stock_results: stockResults,
    });
  } catch (error) {
    console.error("[GRN_CREATE_ERROR]", { message: error?.message });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create goods received note.",
    });
  }
}

module.exports = { list, getById, create };

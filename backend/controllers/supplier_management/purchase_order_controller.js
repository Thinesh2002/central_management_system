const purchaseOrderModel = require("../../models/supplier_management/purchase_order_model");

async function list(req, res) {
  try {
    const { status, supplier_id, search, limit, offset } = req.query || {};
    const data = await purchaseOrderModel.list({ status, supplier_id, search, limit, offset });

    return res.json({ success: true, data: data.rows, total: data.total });
  } catch (error) {
    console.error("[PURCHASE_ORDER_LIST_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to load purchase orders." });
  }
}

async function getById(req, res) {
  try {
    const po = await purchaseOrderModel.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ success: false, message: "Purchase order not found." });
    }

    return res.json({ success: true, data: po });
  } catch (error) {
    console.error("[PURCHASE_ORDER_GET_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to load purchase order." });
  }
}

async function nextNumber(req, res) {
  try {
    const po_number = await purchaseOrderModel.previewNextNumber();
    return res.json({ success: true, data: { po_number } });
  } catch (error) {
    console.error("[PURCHASE_ORDER_NEXT_NUMBER_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to preview next PO number." });
  }
}

async function create(req, res) {
  try {
    const po = await purchaseOrderModel.create({ ...req.body, created_by: req.user?.id || null });
    return res.status(201).json({ success: true, message: "Purchase order created.", data: po });
  } catch (error) {
    console.error("[PURCHASE_ORDER_CREATE_ERROR]", { message: error?.message });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create purchase order.",
    });
  }
}

async function update(req, res) {
  try {
    const po = await purchaseOrderModel.update(req.params.id, {
      ...req.body,
      updated_by: req.user?.id || null,
    });

    if (!po) {
      return res.status(404).json({ success: false, message: "Purchase order not found." });
    }

    return res.json({ success: true, message: "Purchase order updated.", data: po });
  } catch (error) {
    console.error("[PURCHASE_ORDER_UPDATE_ERROR]", { message: error?.message });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update purchase order.",
    });
  }
}

async function updateStatus(req, res) {
  try {
    const po = await purchaseOrderModel.updateStatus(req.params.id, {
      status: req.body?.status,
      updated_by: req.user?.id || null,
    });

    if (!po) {
      return res.status(404).json({ success: false, message: "Purchase order not found." });
    }

    return res.json({ success: true, message: "Purchase order status updated.", data: po });
  } catch (error) {
    console.error("[PURCHASE_ORDER_STATUS_ERROR]", { message: error?.message });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update purchase order status.",
    });
  }
}

async function remove(req, res) {
  try {
    const deleted = await purchaseOrderModel.softDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Purchase order not found." });
    }

    return res.json({ success: true, message: "Purchase order deleted." });
  } catch (error) {
    console.error("[PURCHASE_ORDER_DELETE_ERROR]", { message: error?.message });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete purchase order.",
    });
  }
}

module.exports = { list, getById, nextNumber, create, update, updateStatus, remove };

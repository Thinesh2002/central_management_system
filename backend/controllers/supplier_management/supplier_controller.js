const supplierModel = require("../../models/supplier_management/supplier_model");

// Master admin only, hard-checked here rather than through the delegable
// user_permissions system - Suppliers is intentionally not something an
// admin/user can be granted access to via Access Control.
function requireMasterAdmin(req, res) {
  if (req.user?.role !== "master_admin") {
    res.status(403).json({ success: false, message: "Only a master admin can access supplier data." });
    return false;
  }

  return true;
}

async function list(req, res) {
  if (!requireMasterAdmin(req, res)) return;

  try {
    const { status, search, limit, offset } = req.query || {};
    const data = await supplierModel.list({ status, search, limit, offset });

    return res.json({ success: true, data: data.rows, total: data.total });
  } catch (error) {
    console.error("[SUPPLIER_LIST_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to load suppliers." });
  }
}

async function getById(req, res) {
  if (!requireMasterAdmin(req, res)) return;

  try {
    const supplier = await supplierModel.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found." });
    }

    return res.json({ success: true, data: supplier });
  } catch (error) {
    console.error("[SUPPLIER_GET_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to load supplier." });
  }
}

async function create(req, res) {
  if (!requireMasterAdmin(req, res)) return;

  try {
    const supplier = await supplierModel.create({ ...req.body, created_by: req.user?.id || null });
    return res.status(201).json({ success: true, message: "Supplier created.", data: supplier });
  } catch (error) {
    console.error("[SUPPLIER_CREATE_ERROR]", { message: error?.message });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create supplier.",
    });
  }
}

async function update(req, res) {
  if (!requireMasterAdmin(req, res)) return;

  try {
    const supplier = await supplierModel.update(req.params.id, {
      ...req.body,
      updated_by: req.user?.id || null,
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found." });
    }

    return res.json({ success: true, message: "Supplier updated.", data: supplier });
  } catch (error) {
    console.error("[SUPPLIER_UPDATE_ERROR]", { message: error?.message });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update supplier.",
    });
  }
}

async function remove(req, res) {
  if (!requireMasterAdmin(req, res)) return;

  try {
    const deleted = await supplierModel.softDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Supplier not found." });
    }

    return res.json({ success: true, message: "Supplier deleted." });
  } catch (error) {
    console.error("[SUPPLIER_DELETE_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to delete supplier." });
  }
}

module.exports = { list, getById, create, update, remove };

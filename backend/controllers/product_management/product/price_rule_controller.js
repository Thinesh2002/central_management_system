const priceRuleModel = require("../../../models/product_management/product/price_rule_model");

async function list(req, res) {
  try {
    const { category_id, marketplace, status, search, limit, offset } = req.query || {};
    const data = await priceRuleModel.list({ category_id, marketplace, status, search, limit, offset });

    return res.json({ success: true, data: data.rows, total: data.total });
  } catch (error) {
    console.error("[PRICE_RULE_LIST_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to load price rules." });
  }
}

async function getById(req, res) {
  try {
    const rule = await priceRuleModel.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({ success: false, message: "Price rule not found." });
    }

    return res.json({ success: true, data: rule });
  } catch (error) {
    console.error("[PRICE_RULE_GET_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to load price rule." });
  }
}

async function create(req, res) {
  try {
    const rule = await priceRuleModel.create({ ...req.body, created_by: req.user?.id || null });
    return res.status(201).json({ success: true, message: "Price rule created.", data: rule });
  } catch (error) {
    console.error("[PRICE_RULE_CREATE_ERROR]", { message: error?.message });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create price rule.",
    });
  }
}

async function update(req, res) {
  try {
    const rule = await priceRuleModel.update(req.params.id, { ...req.body, updated_by: req.user?.id || null });

    if (!rule) {
      return res.status(404).json({ success: false, message: "Price rule not found." });
    }

    return res.json({ success: true, message: "Price rule updated.", data: rule });
  } catch (error) {
    console.error("[PRICE_RULE_UPDATE_ERROR]", { message: error?.message });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update price rule.",
    });
  }
}

async function remove(req, res) {
  try {
    const deleted = await priceRuleModel.softDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Price rule not found." });
    }

    return res.json({ success: true, message: "Price rule deleted." });
  } catch (error) {
    console.error("[PRICE_RULE_DELETE_ERROR]", { message: error?.message });
    return res.status(500).json({ success: false, message: "Failed to delete price rule." });
  }
}

module.exports = { list, getById, create, update, remove };

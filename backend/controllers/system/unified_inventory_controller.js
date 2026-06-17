const model = require("../../models/system/unified_inventory_model");

const ok = (res, data = {}, message = "Request completed successfully.") => res.json({ success: true, message, ...data });

const fail = (res, error, fallback = "Request could not be completed.") => {
  const status = error?.statusCode || 500;
  console.error("[UNIFIED_INVENTORY_ERROR]:", error?.message || error);
  return res.status(status).json({
    success: false,
    message: error?.message || fallback,
    user_message: status >= 500
      ? "This inventory module could not load. Please run the latest database patch and check backend logs."
      : (error?.message || fallback)
  });
};

exports.dashboard = async (req, res) => {
  try { ok(res, { data: await model.getDashboard() }, "Inventory dashboard loaded."); }
  catch (error) { fail(res, error, "Failed to load inventory dashboard."); }
};

exports.products = async (req, res) => {
  try { ok(res, await model.getUnifiedInventory(req.query), "Manage All Inventory loaded."); }
  catch (error) { fail(res, error, "Failed to load inventory rows."); }
};

exports.categories = async (req, res) => {
  try { ok(res, await model.getCategories(), "Categories loaded."); }
  catch (error) { fail(res, error, "Failed to load categories."); }
};

exports.addProduct = async (req, res) => {
  try { ok(res, { data: await model.addProduct(req.body) }, "Product saved and inventory created."); }
  catch (error) { fail(res, error, "Failed to save product."); }
};

exports.updateStock = async (req, res) => {
  try { ok(res, { data: await model.updateStock(req.body) }, "Stock updated successfully."); }
  catch (error) { fail(res, error, "Failed to update stock."); }
};

exports.getSkuMappings = async (req, res) => {
  try { ok(res, { rows: await model.getSkuMappings(req.query) }, "SKU mappings loaded."); }
  catch (error) { fail(res, error, "Failed to load SKU mappings."); }
};

exports.saveSkuMapping = async (req, res) => {
  try { ok(res, { data: await model.saveSkuMapping(req.body) }, "SKU mapping saved."); }
  catch (error) { fail(res, error, "Failed to save SKU mapping."); }
};

exports.getPackRules = async (req, res) => {
  try { ok(res, { rows: await model.getPackRules() }, "Pack rules loaded."); }
  catch (error) { fail(res, error, "Failed to load pack rules."); }
};

exports.savePackRule = async (req, res) => {
  try { ok(res, { data: await model.savePackRule(req.body) }, "Pack rule saved."); }
  catch (error) { fail(res, error, "Failed to save pack rule."); }
};

exports.logs = async (req, res) => {
  try { ok(res, { rows: await model.getLogs(req.query) }, "Logs loaded."); }
  catch (error) { fail(res, error, "Failed to load logs."); }
};

exports.bootstrap = async (req, res) => {
  try { await model.ensureUnifiedInventorySchema(); ok(res, {}, "Inventory database schema verified."); }
  catch (error) { fail(res, error, "Failed to verify inventory schema."); }
};

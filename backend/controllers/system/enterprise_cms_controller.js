const model = require("../../models/system/enterprise_cms_model");

const ok = (res, payload = {}, message = "Success") => res.json({ success: true, message, ...payload });
const fail = (res, error) => {
  const status = error.statusCode || error.status || 500;
  console.error("[ENTERPRISE_API_ERROR]", error.message);
  return res.status(status).json({
    success: false,
    message: status >= 500 ? "Something went wrong while processing this module. Please check database migration and backend logs." : error.message,
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};

exports.bootstrap = async (req, res) => { try { await model.ensureSchema(); ok(res, {}, "Database checked successfully."); } catch (e) { fail(res, e); } };
exports.dashboard = async (req, res) => { try { ok(res, { data: await model.getDashboard() }); } catch (e) { fail(res, e); } };
exports.generateSku = async (req, res) => { try { ok(res, { data: await model.generateSku(req.query) }); } catch (e) { fail(res, e); } };
exports.products = async (req, res) => { try { const data = await model.getProducts(req.query); ok(res, { ...data, data: data.rows }); } catch (e) { fail(res, e); } };
exports.saveProduct = async (req, res) => { try { ok(res, { data: await model.saveProduct(req.body) }, "Product saved successfully."); } catch (e) { fail(res, e); } };
exports.updateProduct = async (req, res) => { try { ok(res, { data: await model.updateProduct(req.params.sku, req.body) }, "Product updated successfully."); } catch (e) { fail(res, e); } };
exports.deactivateProduct = async (req, res) => { try { ok(res, { data: await model.deleteProduct(req.params.sku, { hard: false, created_by: req.body?.created_by }) }, "Product deactivated successfully."); } catch (e) { fail(res, e); } };
exports.deleteProduct = async (req, res) => { try { ok(res, { data: await model.deleteProduct(req.params.sku, { hard: req.query.hard === "true", created_by: req.body?.created_by }) }, "Product deleted successfully."); } catch (e) { fail(res, e); } };
exports.updateStock = async (req, res) => { try { ok(res, { data: await model.updateStock(req.body) }, "Stock updated successfully."); } catch (e) { fail(res, e); } };
exports.mappings = async (req, res) => { try { const rows = await model.getMappings(req.query); ok(res, { rows, data: rows, total: rows.length }); } catch (e) { fail(res, e); } };
exports.saveMapping = async (req, res) => { try { ok(res, { data: await model.saveSkuMapping(req.body) }, "SKU mapping saved successfully."); } catch (e) { fail(res, e); } };
exports.categories = async (req, res) => { try { ok(res, await model.getCategories()); } catch (e) { fail(res, e); } };
exports.saveCategory = async (req, res) => { try { ok(res, { data: await model.saveCategory(req.body) }, "Category saved successfully."); } catch (e) { fail(res, e); } };
exports.saveSubCategory = async (req, res) => { try { ok(res, { data: await model.saveSubCategory(req.body) }, "Sub category saved successfully."); } catch (e) { fail(res, e); } };
exports.deleteCategory = async (req, res) => { try { ok(res, { data: await model.deleteCategory(req.params.code, false) }, "Category deactivated."); } catch (e) { fail(res, e); } };
exports.deleteSubCategory = async (req, res) => { try { ok(res, { data: await model.deleteCategory(req.params.code, true) }, "Sub category deactivated."); } catch (e) { fail(res, e); } };
exports.categoryMappings = async (req, res) => { try { const rows = await model.getCategoryMappings(req.query); ok(res, { rows, data: rows, total: rows.length }); } catch (e) { fail(res, e); } };
exports.saveCategoryMapping = async (req, res) => { try { ok(res, { data: await model.saveCategoryMapping(req.body) }, "Category mapping saved."); } catch (e) { fail(res, e); } };
exports.images = async (req, res) => { try { const rows = await model.getImages(req.query); ok(res, { rows, data: rows, total: rows.length }); } catch (e) { fail(res, e); } };
exports.orders = async (req, res) => { try { const rows = await model.getOrders(req.query); ok(res, { rows, data: rows, total: rows.length }); } catch (e) { fail(res, e); } };
exports.updateOrderStatus = async (req, res) => { try { ok(res, { data: await model.updateOrderStatus(req.body) }, "Order status updated."); } catch (e) { fail(res, e); } };
exports.finance = async (req, res) => { try { ok(res, await model.getFinance(req.query)); } catch (e) { fail(res, e); } };
exports.packRules = async (req, res) => { try { const rows = await model.getPackRules(); ok(res, { rows, data: rows, total: rows.length }); } catch (e) { fail(res, e); } };
exports.savePackRule = async (req, res) => { try { ok(res, { data: await model.savePackRule(req.body) }, "Pack rule saved."); } catch (e) { fail(res, e); } };
exports.logs = async (req, res) => { try { const rows = await model.getLogs(req.query); ok(res, { rows, data: rows, total: rows.length }); } catch (e) { fail(res, e); } };

const model = require("../../../models/daraz/advanced/daraz_advanced_model");
const productSyncService = require("../../../services/daraz/daraz_product_sync_service");

const ok = (res, data = {}, message = "Request completed successfully.") => res.json({ success: true, message, ...data });
const fail = (res, error, fallback = "Request could not be completed.") => {
  const status = error?.statusCode || 500;
  console.error("[DARAZ_ADVANCED_CONTROLLER_ERROR]:", error?.message || error);
  return res.status(status).json({
    success: false,
    message: error?.message || fallback,
    user_message: status >= 500 ? "Something went wrong while loading this Daraz module. Please check backend logs and database migration." : (error?.message || fallback)
  });
};

exports.dashboard = async (req, res) => {
  try { ok(res, { data: await model.getDashboard() }, "Daraz dashboard loaded."); }
  catch (error) { fail(res, error, "Failed to load Daraz dashboard."); }
};

exports.products = async (req, res) => {
  try { ok(res, await model.getDarazProductsAdvanced(req.query), "Daraz products loaded."); }
  catch (error) { fail(res, error, "Failed to load Daraz products."); }
};

exports.inventory = async (req, res) => {
  try { ok(res, await model.getManageInventory(req.query), "Daraz inventory loaded."); }
  catch (error) { fail(res, error, "Failed to load Daraz inventory."); }
};

exports.updateStock = async (req, res) => {
  try {
    const payload = { ...req.body, account_code: req.body.account_code || req.params.account_code };
    if (payload.new_stock === undefined || payload.new_stock === null || Number(payload.new_stock) < 0) {
      return res.status(400).json({ success: false, message: "Enter a valid stock quantity." });
    }
    const result = await model.updateDarazStock(payload);
    ok(res, { data: result }, "Stock saved locally and queued for Daraz update.");
  } catch (error) { fail(res, error, "Failed to queue stock update."); }
};

exports.syncQueuedStock = async (req, res) => {
  try {
    // Safe wrapper: current implementation queues stock updates. API push can be implemented from stock queue processor.
    ok(res, { data: { queued: true } }, "Stock queue is ready. Cron/API worker will push pending updates to Daraz.");
  } catch (error) { fail(res, error, "Failed to process stock queue."); }
};

exports.skuMappings = async (req, res) => {
  try { ok(res, { rows: await model.getSkuMappings(req.query) }, "SKU mappings loaded."); }
  catch (error) { fail(res, error, "Failed to load SKU mappings."); }
};

exports.saveSkuMapping = async (req, res) => {
  try { await model.saveSkuMapping(req.body); ok(res, {}, "SKU mapping saved successfully."); }
  catch (error) { fail(res, error, "Failed to save SKU mapping."); }
};

exports.deleteSkuMapping = async (req, res) => {
  try { await model.deleteSkuMapping(req.body); ok(res, {}, "SKU mapping deleted."); }
  catch (error) { fail(res, error, "Failed to delete SKU mapping."); }
};

exports.categoryMappings = async (req, res) => {
  try { ok(res, { rows: await model.getCategoryMappings(req.query) }, "Category mappings loaded."); }
  catch (error) { fail(res, error, "Failed to load category mappings."); }
};

exports.saveCategoryMapping = async (req, res) => {
  try { await model.saveCategoryMapping(req.body); ok(res, {}, "Category mapping saved successfully."); }
  catch (error) { fail(res, error, "Failed to save category mapping."); }
};

exports.packRules = async (req, res) => {
  try { ok(res, { rows: await model.getPackRules() }, "Pack rules loaded."); }
  catch (error) { fail(res, error, "Failed to load pack rules."); }
};

exports.savePackRule = async (req, res) => {
  try { await model.savePackRule(req.body); ok(res, {}, "Pack rule saved successfully."); }
  catch (error) { fail(res, error, "Failed to save pack rule."); }
};

exports.images = async (req, res) => {
  try { ok(res, await model.getImages(req.query), "Daraz images loaded."); }
  catch (error) { fail(res, error, "Failed to load Daraz images."); }
};

exports.netSales = async (req, res) => {
  try { ok(res, await model.getNetSales(req.query), "Net sales report loaded."); }
  catch (error) { fail(res, error, "Failed to load net sales."); }
};

exports.syncLogs = async (req, res) => {
  try { ok(res, { rows: await model.getSyncLogs(req.query) }, "Sync logs loaded."); }
  catch (error) { fail(res, error, "Failed to load sync logs."); }
};

exports.businessReports = async (req, res) => {
  try { ok(res, { data: await model.getBusinessReports(req.query) }, "Business reports loaded."); }
  catch (error) { fail(res, error, "Failed to load business reports."); }
};

exports.syncAllProducts = async (req, res) => {
  try {
    const accountCode = req.params.account_code || null;
    let results;
    if (accountCode) {
      results = await productSyncService.syncAllProducts({ accountCode, force: true, syncType: "manual" });
    } else {
      results = await productSyncService.syncAllProducts({ force: true, syncType: "manual" });
    }
    ok(res, { data: results }, "Daraz product sync completed.");
  } catch (error) { fail(res, error, "Daraz product sync failed."); }
};

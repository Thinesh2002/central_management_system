const asyncHandler = require('../../middleware/async_handler');
const erpModel = require('../../models/erp/erp_model');

function userId(req) {
  return req.user?.id || req.user?.user_id || null;
}

function ok(res, message, data, extra = {}) {
  return res.json({ success: true, message, data, ...extra });
}

const businessDashboard = asyncHandler(async (req, res) => {
  const data = await erpModel.getBusinessDashboard(req.query || {});
  return ok(res, 'Business dashboard loaded.', data);
});

const priceDashboard = asyncHandler(async (req, res) => {
  const result = await erpModel.getPriceDashboard(req.query || {});
  return ok(res, 'Price dashboard loaded.', result.rows, { rows: result.rows, summary: result.summary, pagination: result.pagination });
});

const recalculatePrices = asyncHandler(async (req, res) => {
  const data = await erpModel.recalculatePrices(userId(req));
  return ok(res, 'Price calculation completed.', data);
});

const savePrice = asyncHandler(async (req, res) => {
  const data = await erpModel.savePrice(req.body || {}, userId(req));
  return ok(res, 'SKU price saved and calculated successfully.', data);
});

const imageDashboard = asyncHandler(async (req, res) => {
  const result = await erpModel.getImageDashboard(req.query || {});
  return ok(res, 'Image dashboard loaded.', result.rows, { rows: result.rows, summary: result.summary, pagination: result.pagination });
});

const runImageAudit = asyncHandler(async (req, res) => {
  const data = await erpModel.runImageAudit();
  return ok(res, 'Image audit completed.', data);
});

const updateImageUrl = asyncHandler(async (req, res) => {
  const data = await erpModel.updateImageUrl(req.params.id, req.body?.image_url || req.body?.url, userId(req));
  return ok(res, 'Image URL updated successfully.', data);
});

const setMainImage = asyncHandler(async (req, res) => {
  const data = await erpModel.setMainImage(req.params.id, userId(req));
  return ok(res, 'Main image updated successfully.', data);
});

const pushImage = asyncHandler(async (req, res) => {
  const data = await erpModel.pushImage(req.body || {});
  return res.status(201).json({ success: true, message: data.message || 'Image push added to queue.', data });
});

const productMetrics = asyncHandler(async (req, res) => {
  const data = await erpModel.getProductMetrics(req.query || {});
  return ok(res, 'Product metrics loaded.', data.rows, { rows: data.rows, by_sku: data.by_sku });
});

const skuEconomics = asyncHandler(async (req, res) => {
  const data = await erpModel.getSkuEconomics(req.params.sku || req.query.sku);
  return ok(res, 'SKU economics loaded.', data);
});

const demandAnalysis = asyncHandler(async (req, res) => {
  const result = await erpModel.getDemandAnalysis(req.query || {});
  return ok(res, 'Demand analysis loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});

const skuSearch = asyncHandler(async (req, res) => {
  const data = await erpModel.skuSearch(req.params.sku || req.query.sku);
  return ok(res, 'SKU report loaded.', data);
});

const pushStock = asyncHandler(async (req, res) => {
  const data = await erpModel.pushStock(req.body || {}, userId(req));
  return res.status(201).json({ success: true, message: 'Stock push added to queue.', data });
});

const manualStockUpdate = asyncHandler(async (req, res) => {
  const data = await erpModel.manualStockUpdate(req.body || {}, userId(req));
  return ok(res, 'Manual stock updated successfully.', data);
});

const autoStockSettings = asyncHandler(async (req, res) => {
  const data = await erpModel.getAutoStockSettings();
  return ok(res, 'Auto stock settings loaded.', data);
});

const saveAutoStockSettings = asyncHandler(async (req, res) => {
  const data = await erpModel.saveAutoStockSettings(req.body || {});
  return ok(res, 'Auto stock settings saved.', data);
});

const createTransferJob = asyncHandler(async (req, res) => {
  const data = await erpModel.createTransferJob(req.body || {}, userId(req));
  return res.status(201).json({ success: true, message: 'Transfer job created. Use preview before final marketplace submit.', data });
});

module.exports = {
  businessDashboard,
  priceDashboard,
  recalculatePrices,
  savePrice,
  imageDashboard,
  runImageAudit,
  updateImageUrl,
  setMainImage,
  pushImage,
  productMetrics,
  skuEconomics,
  demandAnalysis,
  skuSearch,
  pushStock,
  manualStockUpdate,
  autoStockSettings,
  saveAutoStockSettings,
  createTransferJob,
};

const asyncHandler = require('../../middleware/async_handler');
const model = require('../../models/marketplace/sku_mapping_model');

const list = asyncHandler(async (req, res) => {
  const result = await model.list(req.query || {});
  return res.json({ success: true, message: 'Marketplace SKU mappings loaded.', data: result.rows, rows: result.rows, pagination: result.pagination });
});

const save = asyncHandler(async (req, res) => {
  const data = await model.upsert(req.body || {});
  return res.status(201).json({ success: true, message: 'Marketplace SKU mapping saved.', data });
});

const remove = asyncHandler(async (req, res) => {
  const data = await model.remove(req.params.id);
  return res.json({ success: true, message: 'Marketplace SKU mapping deleted.', data });
});


const bulk = asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const data = await model.bulkUpsert(rows);
  return res.status(201).json({ success: true, message: 'Marketplace SKU mappings saved.', data, rows: data });
});

const duplicateCheck = asyncHandler(async (req, res) => {
  const data = await model.duplicateCheck({ ...(req.query || {}), ...(req.body || {}) });
  return res.json({ success: true, message: 'SKU duplicate check completed.', data });
});

const suggestions = asyncHandler(async (req, res) => {
  const rows = await model.localSkuSuggestions(req.query || {});
  return res.json({ success: true, message: 'Local SKU suggestions loaded.', data: rows, rows });
});

const unmapped = asyncHandler(async (req, res) => {
  const rows = await model.unmapped(req.query || {});
  return res.json({ success: true, message: 'Unmapped marketplace SKUs loaded.', data: rows, rows });
});

module.exports = { list, save, remove, bulk, duplicateCheck, suggestions, unmapped };

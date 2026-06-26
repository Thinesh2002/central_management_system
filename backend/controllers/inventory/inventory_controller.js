const asyncHandler = require('../../middleware/async_handler');
const inventoryModel = require('../../models/inventory/inventory_model');

function userId(req) {
  return req.user?.id || req.user?.user_id || req.user?.user_uid || null;
}

function send(res, message, data, extra = {}) {
  return res.json({ success: true, message, data, ...extra });
}

const dashboard = asyncHandler(async (req, res) => {
  const data = await inventoryModel.getDashboard();
  return send(res, 'Inventory dashboard loaded.', data);
});

const list = asyncHandler(async (req, res) => {
  const result = await inventoryModel.listInventory(req.query || {});
  return send(res, 'Inventory list loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});

const stockLedger = asyncHandler(async (req, res) => {
  const result = await inventoryModel.getLedger(req.query || {});
  return send(res, 'Stock ledger loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});

const stockAdjustment = asyncHandler(async (req, res) => {
  const data = await inventoryModel.applyStockAdjustment(req.body || {}, userId(req));
  return res.status(201).json({ success: true, message: 'Stock movement saved successfully.', data });
});

const lowStock = asyncHandler(async (req, res) => {
  const result = await inventoryModel.getLowStock(req.query || {});
  return send(res, 'Low stock list loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});

const outOfStock = asyncHandler(async (req, res) => {
  const result = await inventoryModel.getOutOfStock(req.query || {});
  return send(res, 'Out of stock list loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});

module.exports = { dashboard, list, stockLedger, stockAdjustment, lowStock, outOfStock };

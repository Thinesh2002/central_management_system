const asyncHandler = require('../../middleware/async_handler');
const inventoryModel = require('../../models/inventory/inventory_model');
const { sendCsv } = require('../../utils/csv');

function userId(req) {
  return req.user?.id || req.user?.user_id || req.user?.user_uid || null;
}

function wantsCsv(req) {
  return String(req.query.export || req.query.format || '').toLowerCase() === 'csv';
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
  if (wantsCsv(req)) return sendCsv(res, 'inventory_export.csv', result.rows);
  return send(res, 'Inventory list loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});

const stockLedger = asyncHandler(async (req, res) => {
  const result = await inventoryModel.getLedger(req.query || {});
  if (wantsCsv(req)) return sendCsv(res, 'inventory_ledger_export.csv', result.rows);
  return send(res, 'Stock ledger loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});

const stockAdjustment = asyncHandler(async (req, res) => {
  const data = await inventoryModel.applyStockAdjustment(req.body || {}, userId(req));
  return res.status(201).json({ success: true, message: 'Stock movement saved successfully.', data });
});

const lowStock = asyncHandler(async (req, res) => {
  const result = await inventoryModel.getLowStock(req.query || {});
  if (wantsCsv(req)) return sendCsv(res, 'low_stock_export.csv', result.rows);
  return send(res, 'Low stock list loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});

const outOfStock = asyncHandler(async (req, res) => {
  const result = await inventoryModel.getOutOfStock(req.query || {});
  if (wantsCsv(req)) return sendCsv(res, 'out_of_stock_export.csv', result.rows);
  return send(res, 'Out of stock list loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});

const orderStockDeductions = asyncHandler(async (req, res) => {
  const result = await inventoryModel.getOrderStockDeductions(req.query || {});
  if (wantsCsv(req)) return sendCsv(res, 'order_stock_deductions_export.csv', result.rows);
  return send(res, 'Order stock deduction logs loaded.', result.rows, { rows: result.rows, summary: result.summary, pagination: result.pagination });
});

const stockPushQueue = asyncHandler(async (req, res) => {
  const result = await inventoryModel.getStockPushQueue(req.query || {});
  if (wantsCsv(req)) return sendCsv(res, 'stock_push_queue_export.csv', result.rows);
  return send(res, 'Stock push queue loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});

module.exports = { dashboard, list, stockLedger, stockAdjustment, lowStock, outOfStock, orderStockDeductions, stockPushQueue };
